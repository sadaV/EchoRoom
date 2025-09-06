"""
Memory management for agent conversations.
"""

from typing import Dict, List


class InMemoryMemory:
    """
    Simple in-memory storage for conversation history by session ID.
    """
    
    def __init__(self):
        """Initialize empty memory store."""
        self._store: Dict[str, List[Dict[str, str]]] = {}
    
    def get(self, session_id: str) -> List[Dict[str, str]]:
        """
        Get conversation history for a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of message dictionaries with 'role' and 'content' keys
        """
        return self._store.get(session_id, [])
    
    def add(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to the conversation history.
        
        Args:
            session_id: Unique session identifier
            role: Message role ('user' or 'assistant')
            content: Message content
        """
        if session_id not in self._store:
            self._store[session_id] = []
        
        self._store[session_id].append({
            "role": role,
            "content": content
        })
    
    def trim(self, session_id: str, max_turns: int = 20) -> None:
        """
        Trim conversation history to keep only the most recent turns.
        Each turn consists of a user message and assistant response.
        
        Args:
            session_id: Unique session identifier
            max_turns: Maximum number of turns to keep (default: 20)
        """
        if session_id not in self._store:
            return
        
        messages = self._store[session_id]
        
        # Keep only the last max_turns * 2 messages (user + assistant pairs)
        max_messages = max_turns * 2
        if len(messages) > max_messages:
            self._store[session_id] = messages[-max_messages:]