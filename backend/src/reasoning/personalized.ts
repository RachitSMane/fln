// Phase 1 (backward-compatible) personalized rationale builder.
//
// The original `personalized` block was a Phase 1 hand-rolled rationale.
// Phase 2 added a more structured `remediation` block. We keep both: the
// newer remediation block is preferred by the UI but the older
// `personalized` block is preserved verbatim for any Phase 1 consumer.

import { EvaluationReasoning } from '../db';
import { BuildReasoningInput } from './shared';

export function buildPersonalizedRationale(
  input: BuildReasoningInput
): EvaluationReasoning['personalized'] | null {
  if (!input.personalized) return null;
  const p = input.personalized;
  let rationale = `The personalised worksheet reused ${p.failedQuestionsReused} question(s) the student previously got wrong`;
  if (p.newLevelQuestionsAdded > 0) {
    rationale += ` and added ${p.newLevelQuestionsAdded} new question(s) targeting the next curriculum level`;
  }
  if (p.targetClass !== null && p.targetPhrase) {
    rationale += `, supporting the transition to Class ${p.targetClass} (${p.targetPhrase})`;
  }
  rationale += '.';
  return {
    failedQuestionsReused: p.failedQuestionsReused,
    newLevelQuestionsAdded: p.newLevelQuestionsAdded,
    targetPhrase: p.targetPhrase,
    targetClass: p.targetClass,
    rationale,
  };
}