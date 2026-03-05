# Architecture Overview

## System Design

This platform replaces centralized arbitration (Upwork/Fiverr model) with **AI-powered validation** and **smart contract escrow**. When a freelancer submits work, an automated pipeline evaluates the submission across four dimensions, and a Solidity smart contract releases or refunds payment based on the score.

## Component Diagram

```
Client (REST API)
    │
    ├─→ Express Backend (server.js)
    │       ├─→ /jobs          — Job lifecycle CRUD
    │       ├─→ /validation    — Trigger pipeline, view reports
    │       └─→ /reputation    — Query freelancer reputation
    │
    ├─→ Validator Pipeline (orchestrator.js)
    │       ├─→ Layer 1: Structure Agent     (file/dir checks)
    │       ├─→ Layer 2: Execution Agent     (Docker sandbox)
    │       ├─→ Layer 3: Lint Agent          (pylint/eslint)
    │       └─→ Layer 4: Semantic Agent      (Ollama LLM)
    │
    ├─→ AI Services
    │       ├─→ Test Generator    (spec → test suite)
    │       ├─→ Ambiguity Detector (vague spec warnings)
    │       └─→ Model Client      (Ollama wrapper)
    │
    └─→ Blockchain (Sepolia / Hardhat)
            ├─→ Escrow.sol           (payment state machine)
            ├─→ ReputationScore.sol  (on-chain reputation)
            ├─→ SlashingExtension.sol (penalty system)
            └─→ ReputationNFT.sol    (soulbound badges)
```

## Data Flow

1. **Client creates job** → POST /jobs → stores spec hash on-chain
2. **AI generates tests** → POST /validation/generate-tests → client approves
3. **Client funds escrow** → ETH sent to Escrow.sol
4. **Freelancer submits** → POST /jobs/:id/submit → repo URL recorded
5. **Validation runs** → POST /validation/run → 4-layer pipeline
6. **Smart contract settles** → score recorded on-chain → auto pay/refund

## Technology Choices

| Component      | Technology          | Rationale                          |
|----------------|--------------------|------------------------------------|
| API Server     | Express + Node.js  | Fast prototyping, JS ecosystem     |
| Contracts      | Solidity + Hardhat | Industry standard, Sepolia testnet |
| AI Model       | Qwen2.5-Coder      | Code-specialized, runs locally     |
| AI Runtime     | Ollama             | Easy local LLM hosting             |
| Sandbox        | Docker             | Secure code execution isolation    |
| Database       | SQLite / PostgreSQL| Simple for hackathon, scalable     |

## Security Model

- Submitted code runs in Docker with `--network=none`, `--read-only`, memory/CPU limits
- Smart contract uses role-based access (client, freelancer, validator)
- Validator is a trusted backend wallet — future: decentralized validator set
- Report hashes stored on-chain for tamper-proof audit trail
