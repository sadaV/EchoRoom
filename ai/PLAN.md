# EchoRoom Implementation Plan

## Analysis Summary

### 1. Entry Points
- **FastAPI Backend**: `services/api/main.py` - Single FastAPI app with health endpoint
- **Expo App**: `app-mobile/index.js` - Basic console.log starter

### 2. Data Flow Design
- **POST /chat**: Single persona conversation with message history
- **POST /roundtable**: Multiple personas discussing a topic with turn-based responses

### 3. Implementation Plan

## TODO Checklist

### Backend API (services/api/)
- [ ] Create `models.py` - Pydantic models for requests/responses
- [ ] Create `personas.py` - Persona loading and management
- [ ] Update `main.py` - Add CORS, new endpoints, persona integration
- [ ] Create `personas/` directory with sample persona JSON files
- [ ] Add `requirements.txt` with FastAPI, uvicorn, python-multipart dependencies

### Models to Create
```python
# ChatRequest, ChatResponse, RoundtableRequest, RoundtableResponse, Message, Persona
```

### Endpoints to Add
- [ ] `POST /chat` - Single persona conversation
- [ ] `POST /roundtable` - Multi-persona discussion
- [ ] `GET /personas` - List available personas

### Files to Create/Modify

#### New Files:
1. `services/api/models.py` - Pydantic data models
2. `services/api/personas.py` - Persona management utilities  
3. `services/api/personas/alice.json` - Sample persona
4. `services/api/personas/bob.json` - Sample persona
5. `services/api/requirements.txt` - Python dependencies

#### Modified Files:
1. `services/api/main.py` - Add CORS, endpoints, persona integration

### Mobile App (app-mobile/)
- [ ] Create basic chat interface (future task)
- [ ] Create roundtable interface (future task)

### Configuration
- [ ] Add CORS middleware for cross-origin requests
- [ ] Configure proper error handling
- [ ] Add request/response validation

## Implementation Priority
1. Backend models and persona system
2. API endpoints with stub responses
3. Mobile app integration (separate phase)