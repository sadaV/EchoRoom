# EchoRoom: AI Conversational App Development Framework

EchoRoom demonstrates a complete AI-powered conversational application built through structured AI-assisted development. This framework enables technology leaders to rapidly prototype multi-persona AI experiences using modern tooling (FastAPI, LangGraph, Expo) with enterprise-grade features like session management, rate limiting, and deployment automation. The approach balances rapid iteration with production readiness, showing how AI coding assistants can accelerate complex application development while maintaining architectural quality. Leaders can adapt these patterns to build sophisticated AI applications that engage users through multiple AI personalities with rich contextual knowledge.

## How to Use This File

Copy one prompt at a time into Claude Code and review the generated code diffs carefully before proceeding. Run tests after each milestone to ensure functionality. These prompts are representative examples for guidance—adapt the specifics to your architecture, technology stack, and business requirements. Focus on the architectural patterns and integration approaches rather than exact implementation details.

---

## Milestone 1: Backend Scaffolding

**Task:** Establish FastAPI foundation with structured endpoints for persona-based conversations.

**Context:** Need a production-ready API server that can handle multiple conversation modes (single persona chat, multi-persona roundtables) with proper error handling and CORS support for mobile clients.

**Requirements:**
- FastAPI application with health endpoint and CORS middleware
- Pydantic models for request/response validation
- GET /personas endpoint returning available AI personalities
- POST /chat endpoint for single-persona conversations
- POST /roundtable endpoint for multi-persona discussions
- JSON-based persona configuration system with validation
- Structured error responses and request logging

**Output:** Clean API foundation with validated endpoints, persona discovery, and mobile-ready CORS configuration that serves as the backbone for AI integrations.

---

## Milestone 2: OpenAI Integration

**Task:** Replace placeholder responses with OpenAI GPT integration including environment-based configuration and graceful error handling.

**Context:** Transition from static responses to dynamic AI-generated content while establishing production patterns for API key management, error recovery, and cost control through model selection.

**Requirements:**
- Environment variable configuration for OpenAI API key and model selection
- Structured prompt engineering with persona context injection
- Few-shot example support for persona consistency
- Comprehensive error handling for API failures, rate limits, and timeouts
- Token counting and response validation
- Graceful fallback messaging for service disruptions
- Request/response logging for observability

**Output:** Production-ready OpenAI integration with robust error handling, configurable models, and monitoring capabilities that maintains service availability during AI provider issues.

---

## Milestone 3: Agent Orchestration with LangGraph

**Task:** Implement intelligent conversation orchestration using LangGraph to coordinate persona knowledge, quote retrieval, and response styling.

**Context:** Elevate simple chat to sophisticated AI agent workflows that dynamically decide when to use factual knowledge, incorporate persona quotes, and apply character-appropriate styling based on conversation context.

**Requirements:**
- LangGraph workflow with conditional branching: plan → (facts?) → (quotes?) → LLM → style → memory
- Planning agent that analyzes user messages for factual inquiry patterns
- Knowledge base system with persona-specific facts in JSON format
- Quote retrieval system with persona-appropriate historical statements
- Response styling system that maintains character voice consistency
- In-memory conversation history with session management
- Workflow visualization and diagnostic endpoints for operational insight

**Output:** Intelligent agent system that provides contextually-aware responses with dynamic knowledge integration, maintaining persona authenticity while delivering educational value through factual grounding.

---

## Milestone 4: Expo Mobile Application

**Task:** Build cross-platform mobile interface using Expo and expo-router with native navigation patterns.

**Context:** Create production-quality mobile experience that leverages native capabilities while maintaining code sharing across iOS and Android platforms.

**Requirements:**
- Expo 53 with expo-router 5 for type-safe navigation
- Three main screens: Home (persona selection), Chat (1:1 conversations), Roundtable (group discussions)
- Native navigation patterns with proper back button handling
- API integration with environment-based configuration
- Error boundary handling and network failure recovery
- Session persistence using AsyncStorage
- Loading states and optimistic UI updates

**Output:** Professional mobile application with intuitive navigation, robust error handling, and seamless API integration that provides native app experience across platforms.

---

## Milestone 5: Session Management and Metadata Display

**Task:** Implement conversation context persistence and surface AI agent decision metadata to users.

**Context:** Enhance user experience by maintaining conversation continuity across sessions while providing transparency into AI reasoning through metadata badges showing knowledge usage.

**Requirements:**
- UUID-based session management with AsyncStorage persistence
- Session-scoped conversation history with automatic cleanup
- Metadata badge system showing when facts or quotes were used
- Educational disclaimers for AI-generated content transparency
- Session linking between chat and roundtable modes
- Graceful handling of session recovery failures

**Output:** Transparent AI interaction system that maintains context while educating users about AI decision-making through clear metadata presentation and responsible AI disclaimers.

---

## Milestone 6: Visual Design System

**Task:** Implement cohesive design system with persona avatars, square tile layout, and bright color palette for engaging user experience.

**Context:** Create visually appealing interface that balances professional appearance with personality-driven design, using modern UI patterns and consistent theming.

**Requirements:**
- Comprehensive theme system with colors, spacing, and radius definitions
- Avatar component system with emoji fallbacks and future Lottie animation support
- Square persona tiles with perfect aspect ratios and touch feedback
- Persona-specific color coding throughout the application
- Gradient header system with persona-aware theming
- Dark-to-light theme transition with accessibility considerations
- Consistent component styling across all screens

**Output:** Polished user interface with strong visual hierarchy, personality-driven theming, and professional mobile design patterns that enhance user engagement and brand consistency.

---

## Milestone 7: Text-to-Speech Integration

**Task:** Add audio capabilities using expo-speech with platform-optimized playback and control systems.

**Context:** Expand accessibility and user engagement by enabling audio playbook of AI responses with intuitive controls and graceful degradation.

**Requirements:**
- expo-speech integration with platform-specific rate and pitch optimization
- Per-message playback controls in chat interface
- Per-persona playback controls in roundtable discussions
- Visual feedback for playing/stopped states
- Stop/start control with session management
- Audio disclaimer messaging
- Fallback handling for devices without TTS capabilities

**Output:** Accessible audio experience that enhances user engagement while maintaining control granularity and providing clear user feedback about synthetic speech usage.

---

## Milestone 8: Deployment Preparation

**Task:** Containerize application and document deployment strategy for AWS App Runner with production configuration.

**Context:** Prepare application for production deployment with container-based architecture, environment configuration, and operational documentation.

**Requirements:**
- Multi-stage Dockerfile optimized for Python FastAPI applications
- Environment variable configuration for all external dependencies
- Health check endpoints for container orchestration
- DEPLOY.md documentation covering App Runner configuration
- Production environment variable templates
- Container resource sizing recommendations
- Monitoring and logging configuration guidance

**Output:** Production-ready deployment package with comprehensive documentation that enables reliable cloud deployment and operational management.

---

## Milestone 9: Cost and Security Controls

**Task:** Implement production safeguards including rate limiting, usage caps, and operational kill switches.

**Context:** Protect against cost overruns and abuse while maintaining service availability through intelligent throttling and circuit breaker patterns.

**Requirements:**
- Session-based rate limiting with configurable thresholds
- Client IP fallback for anonymous users
- Request throttling with appropriate HTTP 429 responses
- Usage monitoring with alerting thresholds
- Emergency kill switch for AI provider integration
- Request caching for repeated queries
- Token usage tracking and budget controls
- Security headers and input validation

**Output:** Enterprise-grade protection systems that balance user experience with cost control and security, providing operational confidence for production deployment.

---

## Architecture Summary

This framework demonstrates how AI-assisted development can rapidly create sophisticated applications while maintaining production quality. The milestone-based approach ensures each layer builds upon proven foundations, from API design through deployment preparation. Technology leaders can adapt these patterns to accelerate their own AI application development while learning modern toolchain integration patterns.

Key architectural decisions include LangGraph for intelligent orchestration, Expo for cross-platform mobile development, and containerized deployment for operational simplicity. The session management and metadata transparency features demonstrate responsible AI practices that build user trust while enabling rich conversational experiences.