"""
LangGraph agent for orchestrating persona conversations with fact retrieval,
quote integration, and response styling.
"""

import os
import logging
from typing import TypedDict, List, Dict, Optional, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END

from .planner import plan_turn
from .tools.memory import InMemoryMemory
from .tools.facts import load_facts
from .tools.quotes import get_quote
from .tools.style import finalize

logger = logging.getLogger(__name__)

# Global memory instance
memory = InMemoryMemory()


class ConversationState(TypedDict):
    """
    State for the LangGraph conversation agent.
    
    Fields:
        persona: Name of the persona to embody
        persona_style: Speaking style of the persona
        message: Original user message
        session_id: Unique session identifier for conversation history
        history: Previous conversation messages from memory
        facts: List of facts about the persona (if retrieved)
        quote: Famous quote from the persona (if retrieved)
        draft: Raw LLM response before styling
        final: Final styled response
        used: Dictionary tracking which features were used
    """
    persona: str
    persona_style: str
    message: str
    session_id: str
    history: List[Dict[str, str]]
    facts: Optional[List[str]]
    quote: Optional[str]
    draft: Optional[str]
    final: Optional[str]
    used: Dict[str, bool]


def plan(state: ConversationState) -> ConversationState:
    """Plan the conversation turn using planner logic."""
    logger.info(f"Planning turn for persona: {state['persona']}")
    
    plan_result = plan_turn(state["message"], [state["persona"]])
    
    state["used"] = {
        "facts": plan_result["use_facts"],
        "quotes": plan_result["use_quotes"]
    }
    
    logger.info(f"Plan result: {state['used']}")
    return state


def fetch_facts(state: ConversationState) -> ConversationState:
    """Fetch facts about the persona if planning indicated they should be used."""
    if state["used"]["facts"]:
        logger.info(f"Fetching facts for persona: {state['persona']}")
        state["facts"] = load_facts(state["persona"])
        logger.info(f"Retrieved {len(state['facts'] or [])} facts")
    else:
        state["facts"] = None
    
    return state


def fetch_quote(state: ConversationState) -> ConversationState:
    """Fetch a quote from the persona if planning indicated quotes should be used."""
    if state["used"]["quotes"]:
        logger.info(f"Fetching quote for persona: {state['persona']}")
        state["quote"] = get_quote(state["persona"])
        logger.info(f"Retrieved quote: {state['quote']}")
    else:
        state["quote"] = None
    
    return state


def call_llm(state: ConversationState) -> ConversationState:
    """Generate response using OpenAI LLM with context from facts, quotes, and history."""
    logger.info("Calling LLM for response generation")
    
    # Initialize LLM
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    llm = ChatOpenAI(model=model, temperature=0.7)
    
    # Build system message
    system_content = (
        f"You are {state['persona']}, a fictionalized historical figure. "
        f"Your speaking style is: {state['persona_style']}. "
        f"Be educational and concise. Avoid medical/legal/financial advice. "
        f"Refuse harmful content. Keep responses under 100 words."
    )
    
    messages = [SystemMessage(content=system_content)]
    
    # Add few-shot examples if available (would come from persona_json)
    # Note: few-shot examples would be passed in via the persona_json parameter
    # This would be implemented when integrating with the main API
    
    # Build user message with context
    user_content = state["message"]
    
    # Add facts if available
    if state["facts"]:
        facts_text = "\n\nRelevant facts:\n" + "\n".join([f"- {fact}" for fact in state["facts"][:3]])
        user_content += facts_text
    
    # Add quote if available
    if state["quote"]:
        user_content += f'\n\nRelevant quote: "{state["quote"]}"'
    
    # Add brief history summary if available
    if state["history"]:
        # Get last 2 turns (4 messages max)
        recent_history = state["history"][-4:]
        if recent_history:
            history_summary = "Recent conversation context: "
            for msg in recent_history[-2:]:  # Last 2 messages
                role = "You" if msg["role"] == "assistant" else "User"
                content = msg["content"][:50] + "..." if len(msg["content"]) > 50 else msg["content"]
                history_summary += f"{role}: {content}. "
            user_content += f"\n\n{history_summary.strip()}"
    
    messages.append(HumanMessage(content=user_content))
    
    try:
        # Call LLM
        response = llm.invoke(messages)
        state["draft"] = response.content
        logger.info(f"LLM response generated: {len(state['draft'] or '')} characters")
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        state["draft"] = f"I apologize, but I'm having trouble generating a response right now. Please try again."
    
    return state


def style_node(state: ConversationState) -> ConversationState:
    """Apply final styling to the response."""
    logger.info("Applying final styling")
    
    if state["draft"]:
        state["final"] = finalize(state["draft"], state["persona_style"])
        logger.info(f"Styled response: {len(state['final'])} characters")
    else:
        state["final"] = "I apologize, but I couldn't generate a proper response."
    
    return state


def save_memory(state: ConversationState) -> ConversationState:
    """Save the conversation turn to memory."""
    logger.info(f"Saving conversation to memory for session: {state['session_id']}")
    
    # Save user message and assistant response
    memory.add(state["session_id"], "user", state["message"])
    if state["final"]:
        memory.add(state["session_id"], "assistant", state["final"])
    
    # Trim to keep memory manageable
    memory.trim(state["session_id"])
    
    return state


def should_fetch_facts(state: ConversationState) -> str:
    """Conditional edge: fetch facts if needed, otherwise skip to quote fetching."""
    return "fetch_facts" if state["used"]["facts"] else "fetch_quote"


# Build the workflow graph
def create_graph() -> StateGraph:
    """Create and configure the LangGraph workflow."""
    workflow = StateGraph(ConversationState)
    
    # Add nodes
    workflow.add_node("plan", plan)
    workflow.add_node("fetch_facts", fetch_facts)
    workflow.add_node("fetch_quote", fetch_quote)
    workflow.add_node("call_llm", call_llm)
    workflow.add_node("style_node", style_node)
    workflow.add_node("save_memory", save_memory)
    
    # Define edges
    workflow.set_entry_point("plan")
    workflow.add_conditional_edges("plan", should_fetch_facts, {
        "fetch_facts": "fetch_facts",
        "fetch_quote": "fetch_quote"
    })
    workflow.add_edge("fetch_facts", "fetch_quote")
    workflow.add_edge("fetch_quote", "call_llm")
    workflow.add_edge("call_llm", "style_node")
    workflow.add_edge("style_node", "save_memory")
    workflow.add_edge("save_memory", END)
    
    return workflow.compile()


# Global compiled graph
app = create_graph()


def run_turn_langgraph(persona: str, persona_json: dict, message: str, session_id: str) -> dict:
    """
    Execute a conversation turn using the LangGraph agent.
    
    Args:
        persona: Name of the persona
        persona_json: Persona configuration with name, speakingStyle, fewShot
        message: User's message
        session_id: Session identifier for conversation history
        
    Returns:
        Dictionary with 'text' (final response) and 'used' (features used)
    """
    logger.info(f"Starting LangGraph turn for persona: {persona}, session: {session_id}")
    
    # Initialize state
    initial_state = ConversationState(
        persona=persona,
        persona_style=persona_json.get("speakingStyle", "conversational"),
        message=message,
        session_id=session_id,
        history=memory.get(session_id),
        facts=None,
        quote=None,
        draft=None,
        final=None,
        used={"facts": False, "quotes": False}
    )
    
    try:
        # Execute the graph
        result_state = app.invoke(initial_state)
        
        # Normalize metadata structure for consistent API response
        used_meta = result_state.get("used", {})
        normalized_used = {
            "facts": bool(used_meta.get("facts", False)),
            "quotes": bool(used_meta.get("quotes", False))
        }
        
        return {
            "text": result_state["final"],
            "used": normalized_used
        }
    except Exception as e:
        logger.error(f"LangGraph execution failed: {e}")
        return {
            "text": f"I apologize, but I encountered an error processing your request.",
            "used": {"facts": False, "quotes": False}
        }


def graph_spec() -> dict:
    """
    Return the graph specification for diagnostics.
    
    Returns:
        Dictionary describing the graph structure
    """
    return {
        "nodes": [
            "plan",
            "fetch_facts", 
            "fetch_quote",
            "call_llm",
            "style_node",
            "save_memory"
        ],
        "edges": [
            ("START", "plan"),
            ("plan", "fetch_facts", "conditional"),
            ("plan", "fetch_quote", "conditional"), 
            ("fetch_facts", "fetch_quote"),
            ("fetch_quote", "call_llm"),
            ("call_llm", "style_node"),
            ("style_node", "save_memory"),
            ("save_memory", "END")
        ],
        "entry_point": "plan",
        "end_point": "save_memory"
    }


def draw_graph_png(path: str = "agent-graph.png") -> None:
    """
    Attempt to save graph visualization as PNG using networkx if available.
    
    Args:
        path: File path to save the PNG
    """
    try:
        import networkx as nx
        import matplotlib.pyplot as plt
        
        # Create directed graph
        G = nx.DiGraph()
        
        # Add nodes
        nodes = ["START", "plan", "fetch_facts", "fetch_quote", "call_llm", "style_node", "save_memory", "END"]
        G.add_nodes_from(nodes)
        
        # Add edges
        edges = [
            ("START", "plan"),
            ("plan", "fetch_facts"),
            ("plan", "fetch_quote"),
            ("fetch_facts", "fetch_quote"),
            ("fetch_quote", "call_llm"),
            ("call_llm", "style_node"),
            ("style_node", "save_memory"),
            ("save_memory", "END")
        ]
        G.add_edges_from(edges)
        
        # Draw and save
        plt.figure(figsize=(12, 8))
        pos = nx.spring_layout(G)
        nx.draw(G, pos, with_labels=True, node_color='lightblue', 
                node_size=2000, font_size=10, font_weight='bold',
                arrows=True, arrowsize=20)
        
        plt.title("EchoRoom LangGraph Agent Workflow")
        plt.savefig(path, format='png', dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Graph visualization saved to: {path}")
    except ImportError:
        logger.info("NetworkX/matplotlib not available, skipping graph visualization")
    except Exception as e:
        logger.error(f"Failed to generate graph visualization: {e}")