# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

EchoRoom is a minimal starter project with two main components:
- **FastAPI backend** (`services/api/`) - Python web API with a single health endpoint
- **Expo mobile app** (`app-mobile/`) - React Native/Expo mobile application starter

### Key Architecture

```
EchoRoom/
├── services/api/
│   └── main.py          # FastAPI application with health endpoint
├── app-mobile/
│   └── index.js         # Expo app entry point
└── README.md            # Project description
```

## Development Commands

This is a minimal starter project without build scripts, dependency management, or testing infrastructure configured yet. The project structure suggests:

- **Backend**: Run the FastAPI server with `uvicorn main:app --reload` from `services/api/`
- **Mobile**: Run the Expo development server with `npx expo start` from `app-mobile/`

## Key Points

- No package.json, requirements.txt, or other dependency files are present yet
- No build, lint, or test commands are configured
- The FastAPI app uses the title "EchoRoom API" and has a single `/health` endpoint
- This appears to be a fresh project skeleton ready for development

## Dependencies to Install

When setting up this project, you'll likely need to:
- Add Python dependencies (FastAPI, uvicorn) via requirements.txt or similar
- Add Node.js/Expo dependencies via package.json
- Configure development and build scripts