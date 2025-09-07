# EchoRoom: AI Conversational Experience

EchoRoom is a full-stack AI application that enables conversations with historical figures through intelligent agent orchestration. Built with FastAPI backend and Expo mobile frontend, it demonstrates production-ready patterns for AI-powered conversational experiences with sophisticated agent workflows, cost controls, and cross-platform mobile deployment.

## Features

✨ **Multi-Persona Conversations**: Chat with Einstein, Shakespeare, Cleopatra, and more  
🧠 **Intelligent Agent Orchestration**: LangGraph workflow with fact retrieval and quote integration  
📱 **Cross-Platform Mobile**: Native iOS/Android app built with Expo  
🛡️ **Production Security**: Rate limiting, cost caps, kill switches, and abuse protection  
🎙️ **Text-to-Speech**: Native TTS integration with persona-specific audio  
💬 **Flowing Conversations**: Sequential roundtable discussions where personas reference each other  
📊 **Usage Analytics**: Token tracking, request monitoring, and diagnostic endpoints  

## Architecture

### Agent Workflow (LangGraph)

The core intelligence uses a sophisticated LangGraph workflow to orchestrate conversation turns:

```
START → plan → [facts?] → [quotes?] → LLM → style → memory → END
```

**Workflow Steps:**
- **plan**: Analyzes user message to determine if facts/quotes should be used
- **facts**: Conditionally retrieves persona-specific knowledge from JSON files  
- **quotes**: Conditionally fetches relevant historical quotes from the persona
- **LLM**: Generates response using OpenAI with enriched context from facts/quotes/history
- **style**: Applies final response styling based on persona speaking characteristics
- **memory**: Saves the conversation turn for future context and continuity

**Intelligence Features:**
- Dynamic branching based on message content analysis
- Context layering with facts + quotes + conversation history
- Token-efficient processing (skips unnecessary knowledge retrieval)
- Memory persistence across conversation turns
- Error resilience with graceful fallbacks

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Expo Mobile   │    │   FastAPI Server │    │  OpenAI GPT-4   │
│                 │◄──►│                  │◄──►│                 │
│ • React Native  │    │ • LangGraph      │    │ • Completions   │
│ • TypeScript    │    │ • Rate Limiting  │    │ • Token Tracking│
│ • TTS Support   │    │ • Cost Controls  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         │              ┌────────────────┐
         └─────────────►│  Knowledge DB  │
                        │                │
                        │ • Persona Facts│
                        │ • Quote Library│
                        │ • JSON Config  │
                        └────────────────┘
```

## Repository Structure

```
├── services/api/           # FastAPI backend server
│   ├── main.py            # API routes, middleware, cost controls
│   ├── llm_openai.py      # OpenAI integration with usage tracking
│   ├── agents/            # LangGraph agent orchestration
│   │   ├── lg_graph.py    # Main workflow definition
│   │   ├── planner.py     # Message analysis logic
│   │   └── tools/         # Agent tools (facts, quotes, styling, memory)
│   ├── personas/          # Persona configuration JSON files
│   ├── knowledge/         # Factual knowledge base per persona
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile         # Container configuration
│   └── DEPLOY.md         # AWS deployment guide
│
├── app-mobile/            # Expo React Native mobile app
│   ├── app/              # App screens and navigation
│   │   ├── index.tsx     # Home screen (persona selection)
│   │   ├── chat.tsx      # 1:1 conversation interface
│   │   ├── roundtable.tsx# Multi-persona discussions
│   │   └── components/   # Reusable UI components
│   ├── assets/           # Images, icons, splash screens
│   ├── config.ts         # API configuration
│   └── app.json          # Expo configuration
│
├── .github/workflows/     # CI/CD automation
└── CLAUDE.md             # AI-assisted development guide
```

## Quick Start

### Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))
- **Expo CLI** for mobile development
- **Docker** (optional, for containerized deployment)

### Backend Setup

1. **Clone and setup Python environment:**
   ```bash
   git clone <your-repo-url>
   cd EchoRoom/services/api
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   # Create .env file in services/api/
   echo "OPENAI_API_KEY=your-openai-api-key-here" > .env
   echo "OPENAI_MODEL=gpt-4o-mini" >> .env
   echo "DAILY_TOKEN_CAP=150000" >> .env
   ```

3. **Start the server:**
   ```bash
   python -m uvicorn main:app --reload --port 8080
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:8080/personas
   ```

### Mobile App Setup

1. **Install dependencies:**
   ```bash
   cd app-mobile
   npm install
   ```

2. **Update API configuration:**
   ```json
   # Edit app.json extra.API_BASE to point to your backend
   "extra": {
     "API_BASE": "http://localhost:8080"
   }
   ```

3. **Start Expo development server:**
   ```bash
   npx expo start
   ```

4. **Run on device:**
   - Install Expo Go app on your phone
   - Scan the QR code from the terminal
   - Or press `i`/`a` to run iOS/Android simulator

### Test the Complete System

1. **Backend Health Check:**
   ```bash
   curl -X POST http://localhost:8080/chat \
     -H "Content-Type: application/json" \
     -d '{"persona": "Einstein", "message": "Hello Albert!", "sessionId": "test123"}'
   ```

2. **Mobile App Flow:**
   - Open the app and select a persona (Einstein, Shakespeare, etc.)
   - Ask a question and observe the AI response with fact/quote badges
   - Try the roundtable feature for multi-persona conversations
   - Test text-to-speech functionality

3. **Agent Workflow Visualization:**
   ```bash
   # View the LangGraph workflow diagram
   curl http://localhost:8080/diag/graph.png -o agent-workflow.png
   ```

## Advanced Configuration

### Cost Controls & Security
```bash
# Add to .env for production deployment
MIN_INTERVAL_SECONDS=2          # Rate limit: 2s between requests
MAX_REQ_PER_10MIN=10           # Rate limit: 10 requests per 10 minutes  
DAILY_TOKEN_CAP=150000         # Cost control: 150k tokens per day
KILL_SWITCH=off                # Emergency disable: set to "on" to pause AI
DEMO_PIN=your-secret-pin       # Access control: require x-demo-pin header
PUBLIC_DEMO_MODE=off           # Demo mode: reduced persona limits
DISABLE_DIAG=off               # Security: hide diagnostic endpoints
```

### Agent Workflow Customization

The LangGraph workflow can be customized by modifying:
- **`agents/planner.py`**: Message analysis logic
- **`agents/tools/facts.py`**: Knowledge retrieval system
- **`agents/tools/quotes.py`**: Quote integration system
- **`personas/*.json`**: Persona configurations and speaking styles
- **`knowledge/*.json`**: Factual knowledge base content

### Mobile App Theming

Customize the mobile experience by editing:
- **`app/theme.ts`**: Colors, spacing, typography
- **`app/constants/personas.ts`**: Persona display names, taglines, prompts
- **`app/components/`**: Reusable UI components with consistent styling

## Deployment

### AWS App Runner (Recommended)
See `services/api/DEPLOY.md` for complete AWS deployment guide including:
- ECR container registry setup
- App Runner service configuration
- Environment variable management
- CloudWatch monitoring setup

### Docker (Local/Cloud)
```bash
# Build and run containerized backend
cd services/api
docker build -t echoroom-api .
docker run -p 8080:8080 --env OPENAI_API_KEY=your-key echoroom-api
```

### Expo Mobile Deployment
```bash
# Build for app stores
npx expo build:ios     # iOS App Store
npx expo build:android # Google Play Store

# Or use EAS Build for managed workflow
npx eas build --platform all
```

## API Reference

### Core Endpoints
- `GET /health` - Service health check
- `GET /personas` - List available personas  
- `POST /chat` - Single persona conversation
- `POST /roundtable` - Multi-persona discussion

### Diagnostic Endpoints  
- `GET /diag/agent` - Agent system information
- `GET /diag/usage` - Token usage statistics
- `GET /diag/graph.png` - Workflow visualization (requires networkx/matplotlib)

### Request/Response Examples
```bash
# Chat Request
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "Einstein", 
    "message": "Explain relativity simply",
    "sessionId": "user123"
  }'

# Roundtable Request  
curl -X POST http://localhost:8080/roundtable \
  -H "Content-Type: application/json" \
  -d '{
    "personas": ["Einstein", "Shakespeare", "Cleopatra"],
    "message": "What is the meaning of life?",
    "sessionId": "roundtable456"
  }'
```

## Contributing

This repository demonstrates production patterns for AI application development. Key learning areas include:

- **Agent Orchestration**: LangGraph workflow design and conditional branching
- **Cost Management**: Multi-layer rate limiting and token tracking
- **Mobile AI**: Cross-platform conversational interfaces  
- **Production Security**: Authentication, authorization, and abuse prevention
- **Deployment Automation**: Containerization and cloud deployment patterns

## License

MIT License - see LICENSE file for details.