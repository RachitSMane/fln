# `reasoning/` — Evaluation-Report reasoning builders

Phase 1–5 implementation of the structured `EvaluationReasoning` payload
that powers the Evaluation Report UI.

## Goals

- **Deterministic.** No LLM calls, no invented probabilities, no invented
  curriculum content. Every field derives from existing evaluation
  signals (question/answer outcomes, the AI evaluation pipeline's
  JSON output, the FLN Levels Structure markdown, and the lightweight
  `curriculum.ts` descriptors).
- **Cache-friendly.** Reads from an in-memory FLN Levels Structure
  cache (`backend/src/curriculumLoader.ts`) so each request is a Map
  lookup, not a file read.
- **Backward compatible.** The `EvaluationReasoning` shape is additive
  — every new block is optional. Legacy reports without `reasoning`
  fall back to the plain `report.narrative` string.

## Module split

The directory mirrors the conceptual sections of the reasoning payload:

```
backend/src/reasoning/
├── shared.ts            // types + pure helpers, used by every builder
├── explanation.ts       // Phase 1: headline + narrative
├── progression.ts       // Phase 1: blockers + recommendations
├── evidence.ts          // Phase 2: assessed / strongest / weakest / failed / difficulty
├── remediation.ts       // Phase 2: personalised worksheet narrative
├── personalized.ts      // Phase 1 backward-compat rationale (preserved verbatim)
├── curriculumSummary.ts // Phase 3: objective / learning outcome / topics + transition reason
├── confidence.ts        // Phase 4: numeric confidence + categorical level + explanation
└── index.ts             // orchestrator: buildEvaluationReasoning(input) → EvaluationReasoning
```

Each builder exposes a single function. They share types via
`shared.ts` and nothing more; nothing is reached into from across the
module boundary.

## Why split?

The single-file `reasoning.ts` had grown to 665 lines covering seven
distinct concerns. Splitting:

- Keeps each builder under ~150 lines — visible in a single screen.
- Makes every builder independently testable in principle.
- Makes the orchestrator (`index.ts`) read top-to-bottom as a recipe.
- Removes the temptation to reach for cross-cutting shortcuts that
  would couple the builders together.

The output of `buildEvaluationReasoning` is byte-for-byte identical
before and after the split (verified by SHA-256 snapshot diff — see
"Verification" below).

## Orchestration flow

```
                         ┌──────────────────────────────────────────────┐
                         │ buildEvaluationReasoning(input)  (index.ts)  │
                         └─────────────────────┬────────────────────────┘
                                               │
            ┌──────────────────────────────────┼─────────────────────────────┐
            │                                  │                             │
            ▼                                  ▼                             ▼
   shared.ts                                  │                             │
   ┌─ gradeQuestions(q,a)                    │                             │
   ├─ groupFailuresByLevel(qo)               │                             │
   └─ masteryPercent(s,n)                    │                             │
            │                                  │                             │
            ▼                                  ▼                             ▼
   ┌────────────────────────┐ ┌────────────────────────┐ ┌──────────────────────────┐
   │ explanation.ts         │ │ progression.ts         │ │ evidence.ts               │
   │  · buildHeadline       │ │  · buildBlockers       │ │  · buildEvidence           │
   │  · buildNarrative      │ │  · buildRecommendations│ │    (assessedTopics,       │
   │   (uses curriculum +   │ │   (uses curriculum +   │ │     strongestConcepts,    │
   │    failedByLevel)      │ │    failedByLevel)      │ │     weakestConcepts,      │
   └─────────┬──────────────┘ └─────────┬──────────────┘ │     failedQuestionSummary,│
             │                          │                │     difficultyBreakdown)   │
             │                          │                └────────────┬───────────────┘
             │                          │                             │
             ▼                          ▼                             ▼
   ┌────────────────────────┐ ┌────────────────────────┐ ┌──────────────────────────┐
   │ confidence.ts          │ │ remediation.ts         │ │ curriculumSummary.ts     │
   │  · buildConfidence     │ │  · buildRemediation    │ │  · buildCurriculumSummary │
   │    (uses upstream       │ │   (uses curriculum,    │ │   (sync cache read of     │
   │     pipeline confidence │ │    input.personalized, │ │    FLN Levels Structure   │
   │     OR accuracy;        │ │    failedByLevel)      │ │    via curriculumLoader) │
   │     deterministic       │ │                        │ │                           │
   │     thresholds)         │ │                        │ │                           │
   └─────────┬──────────────┘ └─────────┬──────────────┘ └────────────┬───────────────┘
             │                          │                              │
             │                          │                              │
             └──────────────────────────┼──────────────────────────────┘
                                        │
                                        ▼
                          (optional) personalized.ts
                            · buildPersonalizedRationale
                              (Phase 1 backward-compat string)

                                        ▼
                        ┌────────────────────────────────────┐
                        │ EvaluationReasoning               │
                        │  · explanation   (always)          │
                        │  · confidence    (always)          │
                        │  · learningProgression  (always)   │
                        │  · evidence      (always)          │
                        │  · remediation   (optional)        │
                        │  · curriculumSummary (optional)     │
                        │  · personalized  (optional, legacy) │
                        └────────────────────────────────────┘
```

## Builder responsibilities

| Builder | Reads | Writes |
| --- | --- | --- |
| `explanation` | `input`, `failedByLevel`, curriculum descriptor | `explanation.headline`, `explanation.narrative` |
| `progression` | `failedByLevel`, `input.aiEvaluation`, curriculum | `learningProgression.blockers`, `learningProgression.recommendations` |
| `evidence` | questions, answers, `input.aiEvaluation` | `evidence` (assessed / strongest / weakest / failed / difficulty) |
| `remediation` | `input.personalized`, failedByLevel | `remediation` (only if personalized is present) |
| `curriculumSummary` | curriculum descriptor + cached FLN markdown | `curriculumSummary` (only if cache is warm) |
| `confidence` | `input`, `evidence` | `confidence` (score, level, explanation) |
| `personalized` | `input.personalized` | `personalized` (Phase-1 backward-compat block, only if personalized is present) |

All builders are **deterministic pure functions** over their inputs.

## Adding a new builder

1. Create `backend/src/reasoning/<name>.ts`.
2. Add the field to `EvaluationReasoning` in `backend/src/db.ts`.
3. Mirror the type in `frontend/src/types.ts`.
4. Wire the new builder into the orchestrator in `index.ts`.
5. Render the new block in `frontend/src/components/EducationalReasoning.tsx`.
6. Confirm the snapshot diff (`_polish_snapshot.ts`) is still a no-op.

See how `confidence.ts` is wired in `index.ts` for the canonical example.

## Verification

The reasoning output is **byte-for-byte reproducible** for any given
input. We verify this by hashing the JSON snapshot of the orchestrator
output across several representative cases before and after any change:

```text
SHA256 before: F7217263F577146185BC746BB8C37AD3DB589C5342112DBC237AAB3333AAF254
SHA256 after:  F7217263F577146185BC746BB8C37AD3DB589C5342112DBC237AAB3333AAF254
identical.
```

The snapshot script (`_polish_snapshot.ts`) is not part of the build;
it is run manually before merging changes that touch the reasoning
module.

## Suggested tests (when a test runner is added)

The project currently has **no test framework** (see `CLAUDE.md` §Conventions
and `CONTRIBUTING.md`). `npm run lint` is `tsc --noEmit` only. The following
tests are the recommended starting point when one is introduced — they
should NOT be implemented now, per the polish-phase rules:

### `curriculumLoader.spec.ts`

Parse `FLN Levels Structure/Level 4_ Numbers 1–10/Level 4_ Numbers 1–10.md` and assert:

- `objective` contains "Recognize" (the head verb from the .md).
- `learningOutcome.length === 1` (Level 4 has only one LO bullet in the .md).
- `topics` includes `"Number Recognition (1–10)"`, `"Number Tracing"`,
  `"Counting"`, `"Number Names"`.

Parse `Level 27_ Borrow Subtraction/Level 27_ Borrow Subtraction.md` and
assert the bold-only `**Topics Covered**` heading parses (not just the
hash-prefixed form).

Parse `Level 37_ Comparison .../Level 37_Comparison ...md` (the
example in the README at the top of this directory) and assert the
five topics and learning outcomes match.

Parse `Level 59_ Advanced Mastery Assessment/Level 59_...md` and assert
that `topics.length === 0` and `learningOutcome.length === 10` (the
review assessment uses a different `Assessment Structure` section rather
than `Topics Covered`; the parser must tolerate this gracefully).

### `curriculumLoader.spec.ts` (cache)

- `preloadAllCurriculumLevels()` populates the cache for all 59 levels.
- Subsequent `getCurriculumLevelSync(n)` returns the cached value without
  filesystem access.
- Forcing a missing markdown file (move it temporarily) yields a
  well-formed `FLNCurriculumLevel` with empty `objective` / `topics` /
  `learningOutcome` rather than throwing.

### `reasoning/orchestration.spec.ts`

For each of the four representative cases in
`backend/_polish_snapshot.ts`, assert the SHA-256 of the output matches
the pre-recorded hash. The whole point of the deterministic design is
that this should never fail.

### `reasoning/confidence.spec.ts`

- With `aiEvaluation.confidence_score = 0.95`, output score is `0.95`
  and level is `'Very High'`.
- Without `aiEvaluation`, output score is `score / totalQuestions` and
  level respects the documented thresholds (`0.9 / 0.75 / 0.5`).
- The divergence note ("pipeline confidence differs from raw accuracy")
  appears only when both `upstream` and the `accuracy` differ by >1
  percentage point.

These tests would be picked up automatically once a runner (e.g.
`vitest`) is added to the workspace and would replace the manual
snapshot-diff workflow that powers verification today.