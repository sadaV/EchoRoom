"""
OpenAI LLM integration for EchoRoom.

Environment variables:
- OPENAI_API_KEY: Required API key for OpenAI
- OPENAI_MODEL: Optional model override (default: gpt-4o-mini)
"""

import os
from typing import List, Dict, Optional
from openai import OpenAI


def llm_reply(
    persona_name: str,
    persona_style: str, 
    user_msg: str,
    fewshot: Optional[List[Dict]] = None,
    max_tokens: int = 350
) -> str:
    """
    Generate a reply using OpenAI's API.
    
    Args:
        persona_name: Name of the persona/character
        persona_style: Speaking style description
        user_msg: User's message to respond to
        fewshot: Optional few-shot examples [{"user": "...", "assistant": "..."}]
        max_tokens: Maximum tokens in response
        
    Returns:
        Generated response text
        
    Raises:
        ValueError: If OPENAI_API_KEY is not set
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Build system prompt
        system_prompt = (
            "You are a fictionalized historical figure. "
            "Be educational and concise. "
            "Avoid medical/legal/financial advice. "
            "Refuse harmful content."
        )
        
        # Build messages array
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add few-shot examples if provided
        if fewshot:
            for example in fewshot:
                if isinstance(example, dict) and "user" in example and "assistant" in example:
                    messages.append({
                        "role": "user",
                        "content": example["user"]
                    })
                    messages.append({
                        "role": "assistant", 
                        "content": example["assistant"]
                    })
        
        # Add current user prompt with persona context
        user_prompt = f"You are {persona_name}. Style: {persona_style}. Answer briefly.\nUser: {user_msg}"
        messages.append({
            "role": "user",
            "content": user_prompt
        })
        
        # Make API call
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        # Extract and return the response text
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content or f"[{persona_name}] I apologize, but I couldn't generate a proper response."
        else:
            return f"[{persona_name}] Error: No response generated."
            
    except Exception as e:
        return f"[{persona_name}] Error: Unable to generate response ({str(e)}...)"