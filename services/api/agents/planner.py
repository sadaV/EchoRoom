"""
Agent planning logic for determining conversation flow and features.
"""

import random
from typing import List, Dict


# Keywords that trigger fact-based responses
FACT_KEYWORDS = [
    "who", "what", "when", "where", "why", "how",
    "explain", "fact", "facts", "define", "definition",
    "history", "background", "origin", "tell me about",
    "describe", "details", "information", "learn",
    "teach", "example", "examples"
]


def plan_turn(user_msg: str, personas: List[str]) -> Dict[str, any]:
    """
    Plan the conversation turn based on user message and personas.
    
    Args:
        user_msg: The user's input message
        personas: List of persona names to be involved
        
    Returns:
        Dictionary with planning decisions:
        - mode: "roundtable" if multiple personas, "single" otherwise
        - use_facts: True if message contains factual inquiry keywords
        - use_quotes: True with 20% chance for single mode, False for roundtable
    """
    user_msg_lower = user_msg.lower()
    
    # Determine conversation mode
    mode = "roundtable" if len(personas) > 1 else "single"
    
    # Check if message contains factual inquiry keywords
    use_facts = any(keyword in user_msg_lower for keyword in FACT_KEYWORDS)
    
    # Determine if quotes should be used (20% chance for single mode only)
    use_quotes = False
    if mode == "single":
        # Set random seed based on message hash for deterministic behavior
        # (except for the random component)
        random.seed()  # Use current time for true randomness
        use_quotes = random.random() < 0.2
    
    return {
        "mode": mode,
        "use_facts": use_facts,
        "use_quotes": use_quotes
    }