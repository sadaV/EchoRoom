1) Repo map & plan → write to ai/PLAN.md
2) Implement POST /chat (Pydantic models, stub reply, CORS)
3) Implement POST /roundtable (models, <=120w stubs)
4) Create services/agents/graph.py with nodes:
   moderation → planner → persona_loader → context_builder → llm_call → styler (stubs)
5) Wire /chat and /roundtable to call the graph (stub llm_call)
6) Expo: Personas grid, Chat screen, Roundtable screen + fetch hooks
7) Add pytest + ruff + mypy, and a GitHub Action to run them
