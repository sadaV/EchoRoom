"""
Facts loading for persona knowledge enhancement.
"""

import json
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)


def load_facts(persona_name: str) -> List[str]:
    """
    Load facts for a given persona from the knowledge directory.
    
    Args:
        persona_name: Name of the persona to load facts for
        
    Returns:
        List of fact strings, empty if file missing or invalid
    """
    try:
        # Build path to knowledge file
        knowledge_dir = Path(__file__).parent.parent.parent / "knowledge"
        facts_file = knowledge_dir / f"{persona_name}.json"
        
        # Return empty list if file doesn't exist
        if not facts_file.exists():
            logger.info(f"No facts file found for persona: {persona_name}")
            return []
        
        # Load and parse JSON
        with open(facts_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract facts list
        facts = data.get("facts", [])
        
        # Validate that facts is a list of strings
        if not isinstance(facts, list):
            logger.warning(f"Facts for {persona_name} is not a list, returning empty")
            return []
        
        # Filter to ensure all items are strings
        string_facts = [fact for fact in facts if isinstance(fact, str)]
        
        if len(string_facts) != len(facts):
            logger.warning(f"Some facts for {persona_name} were not strings, filtered out")
        
        logger.info(f"Loaded {len(string_facts)} facts for persona: {persona_name}")
        return string_facts
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in facts file for {persona_name}: {e}")
        return []
    except Exception as e:
        logger.error(f"Error loading facts for {persona_name}: {e}")
        return []