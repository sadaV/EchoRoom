from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import time
import logging
import tempfile
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

app = FastAPI(title="EchoRoom API")

# CORS middleware to allow Expo app during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory rate limiter
rate_limiter = {}  # {session_id: last_timestamp}
RATE_LIMIT_SECONDS = 1.5

def check_rate_limit(request: Request, session_id: Optional[str] = None) -> None:
    """Check if request exceeds rate limit. Raises HTTPException(429) if rate limited."""
    # Determine identifier: sessionId > client IP > "anon"
    identifier = session_id or request.client.host if request.client else "anon"
    
    current_time = time.time()
    last_request_time = rate_limiter.get(identifier, 0)
    
    if current_time - last_request_time < RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail={"error": "Too many requests; please wait a moment."}
        )
    
    # Update last request time
    rate_limiter[identifier] = current_time

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
    # Check rate limit
    check_rate_limit(http_request, request.sessionId)
    
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
    start_time = time.time()
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
            reply_text = llm_reply(
                persona_name=persona_name,
                persona_style=persona_style,
                user_msg=request.message,
                fewshot=fewshot_examples
            )
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
    
    # Log request/response
    logger.info(f"Chat - Persona: {request.persona}, Tokens: {token_count}, Latency: {latency_ms}ms, Session: {session_id}")
    
    return ChatResp(text=reply_text, tokens=token_count, meta=meta_info)

@app.post("/roundtable", response_model=RoundtableResp)
def roundtable(request: RoundtableReq, http_request: Request):
    # Check rate limit
    check_rate_limit(http_request, request.sessionId)
    
    start_time = time.time()
    personas_dir = Path(__file__).parent / "personas"
    replies = []
    
    # Limit to first 3 personas
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
                # Use LangGraph agent - each persona gets individual session for roundtable
                session_id = f"roundtable_{persona_name}_{hash(request.message) % 10000}"
                result = run_turn_langgraph(
                    persona=persona_name,
                    persona_json=persona_data,
                    message=request.message,
                    session_id=session_id
                )
                reply_text = result["text"]
                meta_info = result.get("used", {})
                
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
            
            try:
                reply_text = llm_reply(
                    persona_name=actual_persona_name,
                    persona_style=persona_style,
                    user_msg=request.message,
                    fewshot=fewshot_examples
                )
                
                replies.append(RoundtableReply(
                    persona=persona_name,
                    text=reply_text,
                    meta={
                        "fallback": "direct_llm",
                        "used": {"facts": False, "quotes": False}
                    }
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
    
    # Log roundtable request/response
    logger.info(f"Roundtable - Personas: {len(replies)}/{len(personas_to_process)}, Total Tokens: {total_tokens}, Latency: {total_latency_ms}ms")
    
    return RoundtableResp(replies=replies)

@app.get("/diag/agent")
def diag_agent():
    """Diagnostic endpoint for agent system information."""
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
