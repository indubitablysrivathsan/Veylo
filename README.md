# Blockchain Escrow Platform

Decentralized freelance escrow with AI-powered validation. Smart contracts release payment automatically when AI validators confirm work meets requirements.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Start the API server
npm start

# 4. (Optional) Start local blockchain
npm run hardhat:node                    # Terminal 1
npm run deploy:local                    # Terminal 2

# 5. (Optional) Start Ollama for semantic AI
ollama pull qwen2.5-coder:7b
ollama serve

# 6. (Optional) Build sandbox Docker image
npm run sandbox:build
```

## API Endpoints

| Method | Endpoint                       | Description                      |
|--------|--------------------------------|----------------------------------|
| GET    | /health                        | System health check              |
| POST   | /jobs                          | Create a new job                 |
| GET    | /jobs                          | List all jobs                    |
| GET    | /jobs/:id                      | Get job details                  |
| POST   | /jobs/:id/submit               | Freelancer submits work          |
| POST   | /validation/run                | Trigger validation pipeline      |
| GET    | /validation/:jobId             | Get validation report            |
| POST   | /validation/generate-tests     | AI generates test suite from spec|
| POST   | /validation/check-ambiguity    | Check spec for vague requirements|
| GET    | /reputation/:address           | Get freelancer reputation        |

## Demo Flow

```bash
# Create a job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"description":"Build a Python REST API returning Fibonacci numbers","clientAddress":"0x123"}'

# Submit work
curl -X POST http://localhost:3000/jobs/1/submit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/example/fibonacci-api"}'

# Run validation
curl -X POST http://localhost:3000/validation/run \
  -H "Content-Type: application/json" \
  -d '{"jobId":1}'

# Check report
curl http://localhost:3000/validation/1
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## Project Structure

```
blockchain-escrow/
├── contracts/          # Solidity smart contracts
├── validator/          # 4-layer validation engine
│   ├── agents/         # Individual validation agents
│   ├── pipeline/       # Orchestrator and scoring
│   ├── ai/             # LLM integration (Ollama)
│   └── future/         # Planned features (stubs)
├── sandbox/            # Docker sandbox for code execution
├── backend/            # Express API server
│   ├── routes/         # REST endpoints
│   ├── services/       # Business logic
│   └── db/             # Database schema
├── scripts/            # Deploy and CLI tools
├── config/             # Scoring and Docker config
└── docs/               # Documentation
```
