# EchoRoom Starter

Minimal starter with FastAPI + Expo skeleton.

## Agent Architecture (LangGraph)

The EchoRoom agent uses a LangGraph workflow to orchestrate conversation turns:

**Flow:** plan → (facts?) → (quote?) → LLM → style → memory

- **plan**: Analyzes user message to determine if facts/quotes should be used
- **facts**: Conditionally retrieves persona facts from knowledge base  
- **quote**: Conditionally fetches relevant quotes from the persona
- **LLM**: Generates response using OpenAI with context from facts/quotes/history
- **style**: Applies final response styling based on persona speaking style
- **memory**: Saves the conversation turn for future context

### Graph Visualization

To visualize the agent workflow, access: `GET /diag/graph.png`

If the endpoint works (requires networkx/matplotlib), you can:
1. Save the PNG: `curl http://localhost:8000/diag/graph.png -o agent-graph.png`
2. Embed in documentation or view the workflow structure

The graph shows the complete decision tree including conditional branches for fact and quote retrieval.