// Orchestrator. Combines every per-block builder into a single
// `EvaluationReasoning` payload. Behaviour is intentionally identical to
// the previous monolithic `reasoning.ts` — this file is the ONLY place
// that knows the assembly order.
//
// Public surface (unchanged from the original `reasoning.ts`):
//   - `buildEvaluationReasoning(input)`
//
// We also re-export a handful of items that some downstream consumers
// (tests, scripts) previously imported from the old `./reasoning`.
// The set of re-exports matches the original file's `export` list.

import { EvaluationReasoning } from '../db';
import { getLevel, nextLevelAfter, FLN_LEVELS } from '../curriculum';

import { buildHeadline, buildNarrative } from './explanation';
import { buildBlockers, buildRecommendations } from './progression';
import { buildEvidence } from './evidence';
import { buildRemediation } from './remediation';
import { buildPersonalizedRationale } from './personalized';
import { buildCurriculumSummary } from './curriculumSummary';
import { buildConfidence } from './confidence';

import {
  BuildReasoningInput,
  gradeQuestions,
  groupFailuresByLevel,
  masteryPercent,
} from './shared';

// Re-exports preserved from the original `reasoning.ts` for backward
// compatibility with anything that imported them.
export type { BuildReasoningInput } from './shared';
export {
  CONFIDENCE_THRESHOLDS,
  buildConfidence,
  classifyConfidence,
  deriveConfidenceScore,
} from './confidence';
export {
  buildCurriculumSummary,
} from './curriculumSummary';
export const FLN_TOTAL_LEVELS = FLN_LEVELS.length;

/**
 * Phase 1–4 orchestrator. Identical to the previous `reasoning.ts`
 * implementation: same builder call order, same field assembly, same
 * optional-field semantics. The reasoning payload is byte-for-byte
 * reproducible for any given input.
 */
export function buildEvaluationReasoning(input: BuildReasoningInput): EvaluationReasoning {
  const current = getLevel(input.recommendedLevel);
  const next = nextLevelAfter(input.recommendedLevel);
  const outcomes = gradeQuestions(input.questions, input.answers);
  const failedByLevel = groupFailuresByLevel(outcomes);
  const masteryPct = masteryPercent(input.score, input.totalQuestions);

  const headline = buildHeadline(input, current?.name ?? `Level ${input.recommendedLevel}`, masteryPct);
  const narrative = buildNarrative(input, failedByLevel, current?.name ?? `Level ${input.recommendedLevel}`);
  const blockers = buildBlockers(failedByLevel, input.aiEvaluation);
  const recommendations = buildRecommendations(input, failedByLevel, next);
  const evidence = buildEvidence(input.questions, input.answers, input.aiEvaluation);

  const reasoning: EvaluationReasoning = {
    explanation: {
      headline,
      narrative,
    },
    confidence: buildConfidence(input, evidence),
    conceptMastery: evidence.conceptMastery,
    learningProgression: {
      currentLevel: input.recommendedLevel,
      currentLevelName: current?.name ?? `Level ${input.recommendedLevel}`,
      currentStrand: current?.strand ?? 'Number Sense',
      nextMilestone: next
        ? { level: next.id, name: next.name, strand: next.strand }
        : null,
      blockers,
      recommendations,
    },
    evidence,
  };

  // Phase 2: explicit remediation block — only present when personalised
  // pipeline output is available.
  const remediation = buildRemediation(input, failedByLevel);
  if (remediation) reasoning.remediation = remediation;

  // Phase 3: curriculum-aware teaching summary — only present when the
  // FLN Levels Structure curriculum is loaded for both the placed level
  // and (when applicable) the next milestone level. Falls back to the
  // empty payload if the cache is not yet warmed (see curriculumLoader
  // preloadAllCurriculumLevels, called from backend/src/index.ts startup).
  const curriculumSummary = buildCurriculumSummary(
    input.recommendedLevel,
    next?.id ?? null,
    masteryPct
  );
  if (curriculumSummary) reasoning.curriculumSummary = curriculumSummary;

  // Phase 1 backward-compat block — preserved verbatim for Phase 1
  // consumers alongside the newer `remediation` block.
  const personalized = buildPersonalizedRationale(input);
  if (personalized) reasoning.personalized = personalized;

  return reasoning;
}