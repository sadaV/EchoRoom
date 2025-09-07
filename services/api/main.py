from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import os
import time
import logging
import tempfile
import threading
import collections
from collections import deque
from datetime import datetime
from pathlib import Path
from llm_openai import llm_reply
try:
    from agents.lg_graph import run_turn_langgraph, graph_spec, draw_graph_png
    LANGGRAPH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LangGraph not available, falling back to direct LLM calls: {e}")
    LANGGRAPH_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables for cost and abuse controls
DAILY_TOKEN_CAP = int(os.getenv("DAILY_TOKEN_CAP", "150000"))  # tokens/day
MIN_INTERVAL_SECONDS = float(os.getenv("MIN_INTERVAL_SECONDS", "2"))
MAX_REQ_PER_10MIN = int(os.getenv("MAX_REQ_PER_10MIN", "10"))
DEMO_PIN = os.getenv("DEMO_PIN")  # optional
KILL_SWITCH = os.getenv("KILL_SWITCH", "off")  # "on"/"off"
PUBLIC_DEMO_MODE = os.getenv("PUBLIC_DEMO_MODE", "off")  # "on"/"off"
DISABLE_DIAG = os.getenv("DISABLE_DIAG", "off")  # "on" hides /diag endpoints

# In-memory usage trackers
def _today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")

_USAGE = {"day": _today_str(), "tokens_in": 0, "tokens_out": 0, "requests": 0}
_LAST_CALL_BY_SESSION: Dict[str, float] = {}
_WINDOW_BY_IP: Dict[str, deque] = collections.defaultdict(lambda: deque())
_LOCK = threading.Lock()

def _roll_day():
    """Reset usage counters if day has changed."""
    today = _today_str()
    if _USAGE["day"] != today:
        _USAGE["day"] = today
        _USAGE["tokens_in"] = 0
        _USAGE["tokens_out"] = 0
        _USAGE["requests"] = 0

app = FastAPI(title="EchoRoom API")

# CORS middleware to allow Expo app during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _preflight_guard(request: Request, session_id: Optional[str] = None) -> str:
    """
    Comprehensive preflight checks for cost and abuse protection.
    Returns the client identifier (session_id or IP).
    Raises HTTPException if any check fails.
    """
    with _LOCK:
        # Kill switch check
        if KILL_SWITCH.lower() == "on":
            raise HTTPException(
                status_code=503,
                detail={"error": "Demo paused—please try later."}
            )
        
        # Demo PIN check
        if DEMO_PIN:
            provided_pin = request.headers.get("x-demo-pin")
            if not provided_pin or provided_pin != DEMO_PIN:
                raise HTTPException(
                    status_code=401,
                    detail={"error": "Demo access requires valid PIN"}
                )
        
        # Determine client identifier
        client_id = session_id or (request.client.host if request.client else "anon")
        current_time = time.time()
        
        # Per-session minimum interval check
        if session_id and session_id in _LAST_CALL_BY_SESSION:
            time_since_last = current_time - _LAST_CALL_BY_SESSION[session_id]
            if time_since_last < MIN_INTERVAL_SECONDS:
                raise HTTPException(
                    status_code=429,
                    detail={"error": f"Please wait {MIN_INTERVAL_SECONDS - time_since_last:.1f} seconds before next request"}
                )
        
        # Per-IP sliding window check (10 minutes)
        client_ip = request.client.host if request.client else "unknown"
        ten_minutes_ago = current_time - 600  # 10 minutes
        
        # Clean old entries
        while _WINDOW_BY_IP[client_ip] and _WINDOW_BY_IP[client_ip][0] < ten_minutes_ago:
            _WINDOW_BY_IP[client_ip].popleft()
        
        # Check if over limit
        if len(_WINDOW_BY_IP[client_ip]) >= MAX_REQ_PER_10MIN:
            raise HTTPException(
                status_code=429,
                detail={"error": f"Too many requests. Limit: {MAX_REQ_PER_10MIN} per 10 minutes"}
            )
        
        # Daily token cap check
        _roll_day()
        total_tokens = _USAGE["tokens_in"] + _USAGE["tokens_out"]
        if total_tokens >= DAILY_TOKEN_CAP:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Daily usage limit reached. Service resets at midnight UTC.",
                    "used_tokens": total_tokens,
                    "daily_cap": DAILY_TOKEN_CAP
                }
            )
        
        # Update tracking
        if session_id:
            _LAST_CALL_BY_SESSION[session_id] = current_time
        _WINDOW_BY_IP[client_ip].append(current_time)
        _USAGE["requests"] += 1
        
        return client_id

def _update_token_usage(prompt_tokens: int, completion_tokens: int):
    """Safely update token usage counters."""
    with _LOCK:
        _USAGE["tokens_in"] += prompt_tokens
        _USAGE["tokens_out"] += completion_tokens

# Pydantic models
class ChatReq(BaseModel):
    persona: str
    message: str
    sessionId: Optional[str] = None

class ChatResp(BaseModel):
    text: str
    tokens: Optional[int] = None
    meta: Optional[dict] = None

class RoundtableReply(BaseModel):
    persona: str
    text: str
    meta: Optional[dict] = None

class RoundtableReq(BaseModel):
    personas: List[str]
    message: str
    sessionId: Optional[str] = None

class RoundtableResp(BaseModel):
    replies: List[RoundtableReply]

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/personas")
def get_personas():
    personas_dir = Path(__file__).parent / "personas"
    personas = []
    try:
        for persona_file in personas_dir.glob('*.json'):
            with open(persona_file, 'r', encoding='utf-8') as f:
                persona_data = json.load(f)
                personas.append({
                    "name": persona_file.stem,
                    "description": persona_data.get("description", f"A persona with {persona_data.get('speakingStyle', 'unknown')} speaking style"),
                    "speakingStyle": persona_data.get("speakingStyle", "conversational")
                })
    except Exception as e:
        logger.error(f"Error loading personas: {e}")
        # Return default personas if file loading fails
        personas = [
            {"name": "Einstein", "description": "Brilliant physicist known for relativity theory", "speakingStyle": "thoughtful and scientific"},
            {"name": "Shakespeare", "description": "Master playwright and poet of the English Renaissance", "speakingStyle": "eloquent and dramatic"},
            {"name": "Cleopatra", "description": "Legendary queen of ancient Egypt", "speakingStyle": "regal and commanding"}
        ]
    return personas

@app.post("/chat", response_model=ChatResp)
def chat(request: ChatReq, http_request: Request):
    # Preflight guard with comprehensive checks
    client_id = _preflight_guard(http_request, request.sessionId)
    start_time = time.time()
    
    # Load persona JSON file
    personas_dir = Path(__file__).parent / "personas"
    persona_file = personas_dir / f"{request.persona}.json"
    
    # Validate persona name (alphanumeric and underscores only)
    if not request.persona.replace('_', '').isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid persona name '{request.persona}'. Only alphanumeric characters and underscores allowed."
        )
    
    if not persona_file.exists():
        # List available personas for better error message
        available_personas = []
        try:
            for p in personas_dir.glob('*.json'):
                available_personas.append(p.stem)
        except Exception:
            pass
        
        available_msg = f" Available: {', '.join(available_personas)}" if available_personas else ""
        raise HTTPException(
            status_code=400, 
            detail=f"Persona '{request.persona}' not found.{available_msg}"
        )
    
    try:
        with open(persona_file, 'r', encoding='utf-8') as f:
            persona_data = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in persona file {request.persona}.json: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON format in persona file: {request.persona}.json"
        )
    except Exception as e:
        logger.error(f"Error reading persona file {request.persona}.json: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load persona '{request.persona}'"
        )
    
    # Generate response using LangGraph agent or fallback to direct LLM
    session_id = request.sessionId or "anon"
    
    if LANGGRAPH_AVAILABLE:
        try:
            # Use LangGraph agent
            result = run_turn_langgraph(
                persona=request.persona,
                persona_json=persona_data,
                message=request.message,
                session_id=session_id
            )
            reply_text = result["text"]
            meta_info = result.get("used", {})
        except Exception as e:
            logger.error(f"LangGraph agent error for persona {request.persona}: {e}")
            # Fallback to direct LLM call
            reply_text = f"I apologize, but I encountered an error processing your request. Please try again."
            meta_info = {
                "error": "agent_failure",
                "used": {"facts": False, "quotes": False}
            }
    else:
        # Fallback to direct LLM call
        persona_name = persona_data.get("name", request.persona)
        persona_style = persona_data.get("speakingStyle", "helpful and informative")
        fewshot_examples = persona_data.get("fewShot", None)
        
        try:
            llm_result = llm_reply(
                persona_name=persona_name,
                persona_style=persona_style,
                user_msg=request.message,
                fewshot=fewshot_examples
            )
            reply_text = llm_result["text"]
            usage = llm_result.get("usage")
            
            # Update token usage if available
            if usage:
                _update_token_usage(usage["prompt_tokens"], usage["completion_tokens"])
            else:
                # Fallback token estimation
                estimated_tokens = len(reply_text) // 4
                _update_token_usage(estimated_tokens // 2, estimated_tokens // 2)
            
            meta_info = {
                "fallback": "direct_llm",
                "used": {"facts": False, "quotes": False}
            }
        except ValueError as e:
            logger.error(f"LLM configuration error: {e}")
            raise HTTPException(
                status_code=500,
                detail="LLM service not properly configured"
            )
        except Exception as e:
            logger.error(f"LLM error for persona {request.persona}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Unable to generate response for persona '{request.persona}'"
            )
    
    # Count tokens (words) and calculate latency
    token_count = len(reply_text.split())
    latency_ms = int((time.time() - start_time) * 1000)
    
    # Structured logging for chat requests
    session_snippet = session_id[:6] if session_id != "anon" else "anon"
    client_ip = http_request.client.host if http_request.client else "unknown"
    with _LOCK:
        current_usage = _USAGE.copy()
    
    logger.info(
        f"CHAT endpoint=chat session={session_snippet} ip={client_ip} "
        f"persona={request.persona} tokens_in={current_usage['tokens_in']} "
        f"tokens_out={current_usage['tokens_out']} latency_ms={latency_ms}"
    )
    
    return ChatResp(text=reply_text, tokens=token_count, meta=meta_info)

@app.post("/roundtable", response_model=RoundtableResp)
def roundtable(request: RoundtableReq, http_request: Request):
    # Preflight guard with comprehensive checks
    client_id = _preflight_guard(http_request, request.sessionId)
    start_time = time.time()
    
    personas_dir = Path(__file__).parent / "personas"
    replies = []
    transcript = ""  # Running conversation transcript
    
    # Limit to first 3 personas (same for demo and regular modes)
    personas_to_process = request.personas[:3]
    
    for persona_name in personas_to_process:
        # Validate persona name
        if not persona_name.replace('_', '').isalnum():
            replies.append(RoundtableReply(
                persona=persona_name,
                text=f"Error: Invalid persona name '{persona_name}'",
                meta={
                    "error": "invalid_name",
                    "used": {"facts": False, "quotes": False}
                }
            ))
            continue
            
        persona_file = personas_dir / f"{persona_name}.json"
        
        if not persona_file.exists():
            replies.append(RoundtableReply(
                persona=persona_name,
                text=f"Error: Persona '{persona_name}' not found",
                meta={
                    "error": "not_found",
                    "used": {"facts": False, "quotes": False}
                }
            ))
            continue
        
        try:
            with open(persona_file, 'r', encoding='utf-8') as f:
                persona_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in persona file {persona_name}.json: {e}")
            replies.append(RoundtableReply(
                persona=persona_name,
                text=f"Error: Invalid persona file '{persona_name}'",
                meta={
                    "error": "invalid_json",
                    "used": {"facts": False, "quotes": False}
                }
            ))
            continue
        except Exception as e:
            logger.error(f"Error reading persona file {persona_name}.json: {e}")
            replies.append(RoundtableReply(
                persona=persona_name,
                text=f"Error: Unable to load persona '{persona_name}'",
                meta={
                    "error": "load_failure",
                    "used": {"facts": False, "quotes": False}
                }
            ))
            continue
        
        # Generate response using LangGraph agent or fallback to direct LLM
        if LANGGRAPH_AVAILABLE:
            try:
                # Build contextual message with conversation transcript
                if transcript:
                    contextual_message = f"User asked: {request.message}\nConversation so far:\n{transcript}\nNow respond as {persona_name}. Use the conversation so far to tailor your response so the response flows more like a conversation."
                else:
                    contextual_message = f"User asked: {request.message}\nNow respond as {persona_name}."
                
                # Use LangGraph agent - each persona gets individual session for roundtable
                session_id = f"roundtable_{persona_name}_{hash(request.message) % 10000}"
                result = run_turn_langgraph(
                    persona=persona_name,
                    persona_json=persona_data,
                    message=contextual_message,
                    session_id=session_id
                )
                reply_text = result["text"]
                meta_info = result.get("used", {})
                
                # Add demo mode info to meta if applicable
                if PUBLIC_DEMO_MODE.lower() == "on":
                    meta_info["demomode"] = True
                
                # Update running transcript
                transcript += f"{persona_name}: {reply_text}\n\n"
                
                replies.append(RoundtableReply(
                    persona=persona_name,
                    text=reply_text,
                    meta=meta_info
                ))
            except Exception as e:
                logger.error(f"LangGraph agent error for persona {persona_name}: {e}")
                replies.append(RoundtableReply(
                    persona=persona_name,
                    text=f"Error: Unable to generate response for '{persona_name}'",
                    meta={
                        "error": "agent_failure",
                        "used": {"facts": False, "quotes": False}
                    }
                ))
        else:
            # Fallback to direct LLM call
            actual_persona_name = persona_data.get("name", persona_name)
            persona_style = persona_data.get("speakingStyle", "helpful and informative")
            fewshot_examples = persona_data.get("fewShot", None)
            
            # Build contextual message with conversation transcript
            if transcript:
                contextual_message = f"User asked: {request.message}\nConversation so far:\n{transcript}\nNow respond as {persona_name}."
            else:
                contextual_message = f"User asked: {request.message}\nNow respond as {persona_name}."
            
            try:
                llm_result = llm_reply(
                    persona_name=actual_persona_name,
                    persona_style=persona_style,
                    user_msg=contextual_message,
                    fewshot=fewshot_examples
                )
                reply_text = llm_result["text"]
                usage = llm_result.get("usage")
                
                # Update token usage if available
                if usage:
                    _update_token_usage(usage["prompt_tokens"], usage["completion_tokens"])
                else:
                    # Fallback token estimation
                    estimated_tokens = len(reply_text) // 4
                    _update_token_usage(estimated_tokens // 2, estimated_tokens // 2)
                
                meta_info = {
                    "fallback": "direct_llm",
                    "used": {"facts": False, "quotes": False}
                }
                
                # Add demo mode info to meta if applicable
                if PUBLIC_DEMO_MODE.lower() == "on":
                    meta_info["demomode"] = True
                
                # Update running transcript
                transcript += f"{persona_name}: {reply_text}\n\n"
                
                replies.append(RoundtableReply(
                    persona=persona_name,
                    text=reply_text,
                    meta=meta_info
                ))
            except Exception as e:
                logger.error(f"LLM error for persona {persona_name}: {e}")
                replies.append(RoundtableReply(
                    persona=persona_name,
                    text=f"Error: Unable to generate response for '{persona_name}'",
                    meta={
                        "error": "llm_failure",
                        "used": {"facts": False, "quotes": False}
                    }
                ))
    
    # Calculate total latency and tokens
    total_latency_ms = int((time.time() - start_time) * 1000)
    total_tokens = sum(len(reply.text.split()) for reply in replies)
    
    # Structured logging for roundtable requests
    session_snippet = (request.sessionId[:6] if request.sessionId else "anon") 
    client_ip = http_request.client.host if http_request.client else "unknown"
    with _LOCK:
        current_usage = _USAGE.copy()
    
    logger.info(
        f"ROUNDTABLE endpoint=roundtable session={session_snippet} ip={client_ip} "
        f"personas={len(replies)}/{len(personas_to_process)} tokens_in={current_usage['tokens_in']} "
        f"tokens_out={current_usage['tokens_out']} latency_ms={total_latency_ms}"
    )
    
    return RoundtableResp(replies=replies)

@app.get("/diag/usage")
def diag_usage():
    """Usage statistics endpoint (development only)."""
    if DISABLE_DIAG.lower() == "on":
        raise HTTPException(status_code=404, detail="Not found")
    
    with _LOCK:
        _roll_day()
        usage_copy = _USAGE.copy()
    
    return {
        "day": usage_copy["day"],
        "tokens_in": usage_copy["tokens_in"],
        "tokens_out": usage_copy["tokens_out"],
        "requests": usage_copy["requests"],
        "cap": DAILY_TOKEN_CAP
    }

@app.get("/diag/agent")
def diag_agent():
    """Diagnostic endpoint for agent system information."""
    if DISABLE_DIAG.lower() == "on":
        raise HTTPException(status_code=404, detail="Not found")
    # Get graph spec if available
    if LANGGRAPH_AVAILABLE:
        try:
            graph_info = graph_spec()
        except Exception:
            # Fallback graph info if graph_spec fails
            graph_info = {
                "nodes": ["plan", "fetch_facts", "fetch_quote", "call_llm", "style_node", "save_memory"],
                "edges": [
                    ("START", "plan"),
                    ("plan", "fetch_facts", "conditional"),
                    ("plan", "fetch_quote", "conditional"),
                    ("fetch_facts", "fetch_quote"),
                    ("fetch_quote", "call_llm"),
                    ("call_llm", "style_node"),
                    ("style_node", "save_memory"),
                    ("save_memory", "END")
                ]
            }
    else:
        graph_info = {
            "nodes": ["plan", "fetch_facts", "fetch_quote", "call_llm", "style_node", "save_memory"],
            "status": "unavailable"
        }
    
    return {
        "tools": ["facts", "quotes", "style", "memory"],
        "provider": "openai",
        "graph": graph_info,
        "langgraph_available": LANGGRAPH_AVAILABLE,
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    }


@app.get("/diag/graph.png")
def diag_graph_png():
    """Generate and return LangGraph visualization as PNG."""
    if DISABLE_DIAG.lower() == "on":
        raise HTTPException(status_code=404, detail="Not found")
    
    if not LANGGRAPH_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="LangGraph not available - graph visualization not supported"
        )
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        # Generate graph PNG
        draw_graph_png(tmp_path)
        
        # Check if file was actually created
        if not os.path.exists(tmp_path):
            raise HTTPException(
                status_code=501,
                detail="Graph visualization not supported - missing dependencies (networkx/matplotlib)"
            )
        
        # Return as PNG file
        return FileResponse(
            path=tmp_path,
            media_type="image/png",
            filename="agent-graph.png"
        )
        
    except Exception as e:
        logger.error(f"Failed to generate graph PNG: {e}")
        # Clean up temp file if it exists
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
        raise HTTPException(
            status_code=501,
            detail="Graph visualization not supported - missing dependencies or error occurred"
        )
