import boto3
import json
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError


def llm_reply(
    persona_data: Dict[str, Any], 
    message: str, 
    region: str = "us-east-1"
) -> str:
    """
    Generate a reply using AWS Bedrock Claude 3.7 Sonnet model.
    
    Args:
        persona_data: Dict containing persona info (name, speakingStyle, fewShot, etc.)
        message: User message to respond to
        region: AWS region for Bedrock service
        
    Returns:
        Generated response text
    """
    try:
        # Initialize Bedrock client
        bedrock_client = boto3.client(
            service_name='bedrock-runtime',
            region_name=region
        )
        
        # Extract persona info
        persona_name = persona_data.get("name", "Assistant")
        speaking_style = persona_data.get("speakingStyle", "helpful and informative")
        few_shot_examples = persona_data.get("fewShot", [])
        
        # Build system prompt
        system_prompt = (
            f"You are {persona_name}, a fictionalized historical figure. "
            f"Your speaking style is: {speaking_style}. "
            f"Be educational and concise. Avoid medical/legal/financial advice. "
            f"Keep responses under ~350 tokens."
        )
        
        # Build messages array
        messages = []
        
        # Add few-shot examples if they exist
        if few_shot_examples:
            for example in few_shot_examples:
                if isinstance(example, dict) and "user" in example and "assistant" in example:
                    messages.append({
                        "role": "user",
                        "content": example["user"]
                    })
                    messages.append({
                        "role": "assistant", 
                        "content": example["assistant"]
                    })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": message
        })
        
        # Prepare request body
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 350,
            "system": system_prompt,
            "messages": messages,
            "temperature": 0.7
        }
        
        # Make the API call
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-7-sonnet-2025-05-21-v1:0",
            body=json.dumps(request_body),
            contentType="application/json",
            accept="application/json"
        )
        
        # Parse response
        response_body = json.loads(response["body"].read())
        
        # Extract the generated text
        if "content" in response_body and len(response_body["content"]) > 0:
            return response_body["content"][0]["text"]
        else:
            return f"[{persona_name}] I apologize, but I couldn't generate a proper response."
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        return f"[{persona_name}] Error: AWS Bedrock service unavailable ({error_code})"
    
    except Exception as e:
        return f"[{persona_name}] Error: Unable to generate response ({str(e)[:50]}...)"