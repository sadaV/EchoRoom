"""
Quotes retrieval for persona authenticity.
"""

from typing import Optional


# Hardcoded safe, short quotes for each persona
PERSONA_QUOTES = {
    "Einstein": "Imagination is more important than knowledge.",
    "Cleopatra": "I will not be triumphed over.",
    "Shakespeare": "All the world's a stage.",
    "DaVinci": "Learning never exhausts the mind.",
    "MarieCurie": "Nothing in life is to be feared, it is only to be understood.",
    "AdaLovelace": "The Analytical Engine might act upon other things besides number."
}


def get_quote(persona_name: str) -> Optional[str]:
    """
    Get a famous quote for the given persona.
    
    Args:
        persona_name: Name of the persona
        
    Returns:
        A short, safe quote string, or None if no quote available
    """
    return PERSONA_QUOTES.get(persona_name)