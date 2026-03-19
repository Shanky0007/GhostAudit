# GhostAudit

Revenue Intelligence Through Synthetic Identity Testing

## Setup

1. Copy `.env.example` to `.env` and fill in required values:
   ```bash
   cp .env.example .env
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Set up Python services (anomaly-engine and revenue-engine):
   ```bash
   # Anomaly Engine
   cd services/anomaly-engine
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   cd ../..

   # Revenue Engine
   cd services/revenue-engine
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   cd ../..
   ```

## Development

Start all Node.js services (server, client, persona-engine):
```bash
npm run dev
```

Start Python services in separate terminals:
```bash
# Anomaly Engine (port 3003)
cd services/anomaly-engine
.venv\Scripts\activate
uvicorn main:app --port 3003

# Revenue Engine (port 3004)
cd services/revenue-engine
.venv\Scripts\activate
uvicorn main:app --port 3004
```

## Services

| Service | Port | Start Command |
|---------|------|---------------|
| React + Vite Dashboard | 5173 (dev) / 3000 (prod) | `npm run dev --workspace=client` |
| Fastify API | 3001 | `npm run dev --workspace=server` |
| Persona Engine | 3002 | `npm run dev --workspace=services/persona-engine` |
| Anomaly Engine | 3003 | `cd services/anomaly-engine && uvicorn main:app --port 3003` |
| Revenue Engine | 3004 | `cd services/revenue-engine && uvicorn main:app --port 3004` |
| PostgreSQL | 5432 | `docker-compose up postgres` |
| Redis | 6379 | `docker-compose up redis` |

## Architecture

- **client/**: React + Vite + TypeScript frontend
- **server/**: Node.js + Fastify backend API
- **services/persona-engine/**: Persona generation + goal compilation
- **services/anomaly-engine/**: Python + FastAPI anomaly detection
- **services/revenue-engine/**: Python + FastAPI revenue impact calculation
- **packages/shared-types/**: Shared TypeScript types and Zod schemas

## Environment Variables

Key environment variable: `AGENT_CONCURRENCY` (default: 2)
- Controls how many TinyFish browser sessions run in parallel
- Pay-as-you-go: 2 concurrent agents
- Starter: 10 concurrent agents
- Pro: 50 concurrent agents

See `.env.example` for all required environment variables.
