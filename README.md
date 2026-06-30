# 🌟 MakeMyLook — Multi-Agent AI Customer Support Backend

A production-ready multi-agent AI customer support platform for [MakeMyLook](https://makemylook.beauty), India's beauty services marketplace.

## Architecture

The system uses a **Supervisor-Agent pattern** where every user message flows through an intelligent supervisor that routes it to the most appropriate specialized agent:

| Agent | Role |
|-------|------|
| 🧠 **Supervisor** | Routes messages, detects language, classifies intent |
| 💬 **Customer Support** | FAQs, booking help, general assistance |
| 🔍 **Vendor Discovery** | Real-time vendor search via MakeMyLook API |
| 🎯 **Recommendation** | Smart vendor recommendations with ranking |
| 📚 **Knowledge** | Policy questions with source citations (RAG) |
| 🤝 **Human Handoff** | Graceful escalation to human support |

## Features

- **Multi-Agent AI** — 6 specialized agents coordinated by a supervisor
- **Live API Integration** — Real vendor data from MakeMyLook's API
- **Multilingual** — English, Hindi (Roman + Devanagari), Odia (Roman + Odia script)
- **Conversation Memory** — Redis-backed session persistence
- **SSE Streaming** — Real-time token-by-token response streaming
- **Smart Recommendations** — Composite scoring (rating × distance × budget × social proof)
- **Knowledge Base** — Policy/FAQ answers with source citations
- **Production Ready** — Rate limiting, circuit breaker, retry logic, caching, Docker

## Quick Start

### 1. Prerequisites
- Node.js 20+
- Redis (or Docker)
- OpenAI API key

### 2. Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start Redis (if not using Docker)
redis-server
```

### 3. Run
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Docker
```bash
# Start all services
cd docker
docker compose up -d
```

## API Endpoints

### Chat (Standard)
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Find salons near me",
  "sessionId": "optional-session-id",
  "latitude": 20.2961,
  "longitude": 85.8245
}
```

### Chat (Streaming)
```bash
POST /api/chat/stream
Content-Type: application/json

# Returns SSE events: thinking, token, vendor_card, source, suggestion, done
```

### Health Check
```bash
GET /api/health
```

## Example Conversations

**English:**
```
User: "Find bridal makeup under ₹8000"
AI: "Sure! 😊 Here are the best bridal makeup options within your budget..."
```

**Hindi (Roman):**
```
User: "Mujhe salon chahiye"
AI: "Bilkul! 😊 Main aapke nazdeek ke salon dhundti hoon..."
```

**Odia (Roman):**
```
User: "Mate salon darkar"
AI: "Hau! 😊 Mu apananka pain nikata salon khojibi..."
```

## Tech Stack

- **Runtime:** Node.js + TypeScript + Express
- **AI:** OpenAI GPT-4o (agents) + GPT-4o-mini (routing)
- **Memory:** Redis (sessions + cache)
- **Vector Store:** ChromaDB (RAG — future)
- **Deployment:** Docker + Docker Compose

## License

Private — MakeMyLook © 2026

# mml-backend-agent
# mml-backend-agent
