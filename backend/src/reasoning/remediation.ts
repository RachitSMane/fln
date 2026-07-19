// Phase 2: remediation builder.
//
// Pure surface of the personalised evaluation pipeline output. We do NOT
// regenerate the personalised exam; we only narrate what was selected and why.

import { EvaluationReasoning } from '../db';
import { getLevel } from '../curriculum';
import { BuildReasoningInput, FailedByLevelMap } from './shared';

export function buildRemediation(
  input: BuildReasoningInput,
  failedByLevel: FailedByLevelMap
): EvaluationReasoning['remediation'] | undefined {
  if (!input.personalized) return undefined;

  const p = input.personalized;
  const failedByLevelKeys = Array.from(failedByLevel.keys())
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const lowestFailed = failedByLevelKeys[0];

  const parts: string[] = [];
  parts.push(
    `The personalised worksheet reuses ${p.failedQuestionsReused} question(s) the student previously got wrong`
  );
  if (p.newLevelQuestionsAdded > 0) {
    parts.push(`and adds ${p.newLevelQuestionsAdded} new question(s) targeting the next curriculum level`);
  }
  if (p.targetClass !== null && p.targetPhrase) {
    parts.push(`supporting the transition to Class ${p.targetClass} (${p.targetPhrase})`);
  }
  if (typeof lowestFailed === 'number') {
    const desc = getLevel(lowestFailed);
    parts.push(`remediation starts at Level ${lowestFailed}${desc ? ` (${desc.name})` : ''}`);
  }
  if (input.aiEvaluation?.assign_reason) {
    parts.push(`pipeline rationale: ${input.aiEvaluation.assign_reason}`);
  }

  const reason = parts.join('; ') + '.';

  return {
    reusedFailedQuestions: p.failedQuestionsReused,
    newlyIntroducedCurriculum: p.newLevelQuestionsAdded,
    remediationReason: reason,
    targetClass: p.targetClass,
    targetPhrase: p.targetPhrase,
  };
}