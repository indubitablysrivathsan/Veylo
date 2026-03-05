# Scoring Formula

## Weighted Aggregation

The final validation score combines four independent assessment layers:

```
finalScore = 0.40 × execution + 0.20 × structure + 0.20 × lint + 0.20 × semantic
```

Each layer produces a score from 0 to 100. The final score is rounded to the nearest integer.

## Layer Breakdown

### Execution (40% weight)
Highest weight because passing tests is the strongest signal of functional correctness.

```
execution_score = (testsPassed / testsTotal) × 100
```

### Structure (20% weight)
Verifies the repo contains required files and directories from the spec.

```
structure_score = (filesFound / filesRequired) × 100
```

### Lint (20% weight)
Static analysis quality. Deductions per issue type.

```
lint_score = max(0, 100 - errors×3 - warnings×1)
```

### Semantic (20% weight)
LLM-based reasoning about whether the code fulfills the spirit of the requirements, not just the letter.

Returns 0–100 based on the model's assessment.

## Verdict Thresholds

| Score Range | Verdict  | Action                            |
|-------------|----------|-----------------------------------|
| 75–100      | PASS     | Payment released to freelancer    |
| 50–74       | DISPUTE  | 7-day dispute window opens        |
| 0–49        | FAIL     | Refund issued to client           |

## Configuration

All weights and thresholds are configurable via environment variables or `config/scoringConfig.js`.

## Example Report

```json
{
  "overallScore": 84,
  "verdict": "PASS",
  "execution": { "score": 92, "testsPassed": 11, "testsTotal": 12 },
  "structure": { "score": 100, "passed": 5, "total": 5 },
  "lint":      { "score": 72, "errorCount": 4, "warningCount": 12 },
  "semantic":  { "score": 79, "reasoning": "..." }
}
```

Calculation: `0.40×92 + 0.20×100 + 0.20×72 + 0.20×79 = 36.8 + 20 + 14.4 + 15.8 = 87` → PASS
