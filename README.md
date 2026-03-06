# Veylo

## Overview

**Veylo** is a **decentralized escrow platform** that bridges the gap between freelance work and guaranteed payment. By combining Blockchain immutability with AI-driven semantic analysis, we’ve turned subjective project milestones into objective, self-executing code. We aren't just automating payments; we’re building the infrastructure for a trustless global labor market.

The platform eliminates subjective dispute resolution by enforcing **objective validation rules** defined before work begins. Freelancers are evaluated based on functional correctness, execution results, and code quality rather than subjective human judgment.

Unlike traditional freelance marketplaces, the platform does **not rely on centralized arbitration**. Instead, contract state transitions and validation outcomes are recorded immutably on-chain while payments are handled through traditional financial rails.

The result is a system where **neither party can manipulate the outcome once the contract begins**.

---

## Key Principles

The platform is built around three core guarantees:

1. **Requirements are locked before work begins**
2. **Work completion is determined through deterministic validation**
3. **Contract execution is immutably recorded on-chain**

These guarantees ensure fairness for both clients and freelancers.

---

## Core Features

### AI Requirement → Test Generation

Clients describe their project in natural language.
The system automatically converts this description into structured validation tests.

Example input:

```
Build a Python REST API that returns Fibonacci numbers with proper error handling.
```

Generated validation expectations:

```
Expected functionality:
- endpoint /fibonacci
- function fibonacci(n)
- error handling for invalid input

Test cases:
- n=0 → 0
- n=10 → 55
- n=-1 → HTTP 400
- n=abc → HTTP 422
```

Clients review and approve these tests before the contract is locked.

---

### Immutable Contract Specification

Once approved, two cryptographic hashes are generated:

* `requirementsHash`
* `testSuiteHash`

These hashes are stored in a smart contract and represent the **immutable contract definition**.
Validation must always match these hashes, preventing requirement manipulation.

---

### Hybrid Validation Engine

Submitted work is evaluated through a multi-layer validation pipeline.

Validation layers:

1. **Repository Viability Check**
   Ensures the repository contains legitimate source code.

2. **Sandbox Execution**
   Runs the generated test suite inside an isolated container.

3. **Static Code Analysis**
   Uses language-specific tools to evaluate code quality.

4. **Semantic AI Evaluation**
   A local model analyzes whether the implementation satisfies the specification.

---

### Deterministic Scoring System

Validation results are combined using a weighted scoring model:

```
final_score =
0.50 × execution_score
0.10 × repo_viability_score
0.20 × lint_score
0.20 × semantic_score
```

Decision thresholds:

* **Score ≥ 0.75** → Automatic payment release
* **0.50–0.74** → Dispute window
* **Score < 0.50** → Automatic refund

---

### Secure Sandbox Execution

All submissions run in an isolated container with strict security constraints.

Example configuration:

```
--memory=512m
--cpus=1
--network=none
--read-only
--timeout=30s
```

This prevents malicious code execution or manipulation of validation results.

---

### Blockchain Audit Layer

The blockchain serves as an immutable contract verification layer.

Each job records:

* requirements hash
* test suite hash
* validation score
* validation report hash
* contract state transitions

The blockchain ensures contract outcomes cannot be altered after execution.

---

### Real-Time Validation Dashboard

During validation, the platform provides a live execution pipeline:

```
Repo Cloned
Dependencies Installed
Running Tests
Static Analysis
Semantic Evaluation
Final Score
Payment Released
```

This provides complete transparency into the validation process.

---

### Anti-Ghosting Mechanism

The system automatically handles inactivity:

* **Freelancer inactivity** → escrow refunded after deadline
* **Client inactivity after validation** → payment automatically released

This ensures the contract always resolves without manual arbitration.

---

## User Roles

### Client

Clients can:

* create jobs
* approve validation tests
* fund escrow
* monitor validation results
* view freelancer reputation

---

### Freelancer

Freelancers can:

* browse available jobs
* view locked validation requirements
* download the validation test suite
* submit repository work
* monitor validation progress
* receive payment

---

## Authentication

Users authenticate using standard web authentication methods:

* Google OAuth
* Email and password login

The platform manages blockchain interactions internally, so users never need to manage crypto wallets.

---

## Technology Stack

### Frontend

* React
* TypeScript
* Role-based dashboards
* Real-time validation pipeline UI

### Backend

* Node.js / Express
* REST API services
* Validation orchestration
* Payment integration

### Validation Engine

* Docker sandbox execution
* Static analysis tools (pylint, flake8, eslint)
* AI semantic evaluation using **Qwen-based local models**

### Blockchain Layer

* Solidity smart contracts
* Contract state logging
* Immutable validation records

### Storage

* Database for user and job data
* Blockchain for audit logs
* Object storage for validation reports

---

## System Workflow

1. Client creates a job
2. AI generates validation tests
3. Client approves the test suite
4. Contract specification is hashed and stored on-chain
5. Client funds escrow
6. Freelancer submits repository
7. Validation pipeline executes
8. Validation score is computed
9. Blockchain records the validation result
10. Payment is automatically released or refunded
11. Reputation metrics are updated

---

## Repository Structure

```
blockchain-escrow
│
├── contracts
│   ├── Escrow.sol
│   ├── ReputationScore.sol
│
├── validator
│   ├── agents
│   │   ├── structureAgent.js
│   │   ├── executionAgent.js
│   │   ├── lintAgent.js
│   │   └── semanticAgent.js
│   │
│   ├── pipeline
│   │   ├── orchestrator.js
│   │   ├── scoreAggregator.js
│   │   └── jobTypeDetector.js
│   │
│   └── ai
│       ├── testGenerator.js
│       ├── ambiguityDetector.js
│       └── modelClient.js
│
├── sandbox
│   ├── Dockerfile
│   └── runner.sh
│
├── backend
│   ├── routes
│   ├── services
│   └── database
│
├── frontend
│   ├── auth
│   ├── client
│   ├── freelancer
│   └── dashboard
│
└── docs
    ├── ARCHITECTURE.md
    ├── VALIDATION_PIPELINE.md
    └── SCORING_FORMULA.md
```

---

## Future Enhancements

Potential extensions include:

* fraud detection through repository similarity analysis
* reputation NFTs for verifiable work history
* expanded job validation pipelines for additional task types
* automated dispute resolution models

---

## Vision

Veylo introduces **autonomous freelance contracts**.

Requirements are defined and locked before work begins.
Validation is performed through deterministic pipelines rather than human opinion.
Contract outcomes are recorded immutably on-chain.

The result is a freelance ecosystem where **trust is replaced with verification**.
