"""
Text styling and finalization for persona responses.
"""

import re


def finalize(text: str, persona_style: str, max_words: int = 140) -> str:
    """
    Finalize response text with word limit and educational disclaimer.
    
    Args:
        text: The raw response text
        persona_style: The persona's speaking style (for potential future use)
        max_words: Maximum number of words to allow (default: 140)
        
    Returns:
        Finalized text with word limit and educational disclaimer
    """
    # Split into words and limit count
    words = text.split()
    
    if len(words) > max_words:
        # Trim to max_words
        trimmed_words = words[:max_words]
        trimmed_text = ' '.join(trimmed_words)
        
        # Try to end at a sentence boundary near the limit
        # Look backwards from the end for sentence-ending punctuation
        for i in range(len(trimmed_text) - 1, max(0, len(trimmed_text) - 50), -1):
            if trimmed_text[i] in '.!?':
                trimmed_text = trimmed_text[:i + 1]
                break
        else:
            # No sentence boundary found, add ellipsis
            trimmed_text = trimmed_text.rstrip('.!?,;: ') + '...'
    else:
        trimmed_text = text
    
    # Clean up spacing and ensure proper ending
    trimmed_text = re.sub(r'\s+', ' ', trimmed_text.strip())
    
    # Ensure text ends with punctuation
    if trimmed_text and trimmed_text[-1] not in '.!?':
        if trimmed_text.endswith('...'):
            pass  # Already has ellipsis
        else:
            trimmed_text += '.'
    
    # Add educational disclaimer
    disclaimer = " — Fictionalized, educational response."
    final_text = trimmed_text + disclaimer
    
    return final_text