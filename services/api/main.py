from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from pathlib import Path
from .llm_bedrock import llm_reply

app = FastAPI(title="EchoRoom API")

# CORS middleware to allow Expo app during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatReq(BaseModel):
    persona: str
    message: str
    sessionId: Optional[str] = None

class ChatResp(BaseModel):
    text: str
    tokens: Optional[int] = None

class RoundtableReply(BaseModel):
    persona: str
    text: str

class RoundtableReq(BaseModel):
    personas: List[str]
    message: str

class RoundtableResp(BaseModel):
    replies: List[RoundtableReply]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/chat", response_model=ChatResp)
def chat(request: ChatReq):
    # Load persona JSON file
    personas_dir = Path(__file__).parent / "personas"
    persona_file = personas_dir / f"{request.persona}.json"
    
    if not persona_file.exists():
        raise HTTPException(
            status_code=400, 
            detail=f"Persona '{request.persona}' not found. Available personas should be in /personas/{request.persona}.json"
        )
    
    try:
        with open(persona_file, 'r', encoding='utf-8') as f:
            persona_data = json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid JSON in persona file: {request.persona}.json"
        )
    
    # Generate LLM reply using persona data
    reply_text = llm_reply(persona_data, request.message)
    
    # Count tokens (words)
    token_count = len(reply_text.split())
    
    return ChatResp(text=reply_text, tokens=token_count)

@app.post("/roundtable", response_model=RoundtableResp)
def roundtable(request: RoundtableReq):
    personas_dir = Path(__file__).parent / "personas"
    replies = []
    
    # Limit to first 3 personas
    personas_to_process = request.personas[:3]
    
    for persona_name in personas_to_process:
        persona_file = personas_dir / f"{persona_name}.json"
        
        if not persona_file.exists():
            # Add error reply for missing persona
            replies.append(RoundtableReply(
                persona=persona_name,
                text="Error: persona not found"
            ))
            continue
        
        try:
            with open(persona_file, 'r', encoding='utf-8') as f:
                persona_data = json.load(f)
        except json.JSONDecodeError:
            # Add error reply for invalid JSON
            replies.append(RoundtableReply(
                persona=persona_name,
                text="Error: persona not found"
            ))
            continue
        
        # Generate LLM reply using persona data
        reply_text = llm_reply(persona_data, request.message)
        
        replies.append(RoundtableReply(
            persona=persona_name,
            text=reply_text
        ))
    
    return RoundtableResp(replies=replies)
