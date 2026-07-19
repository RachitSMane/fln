// Phase 1: progression builders.
//
// Produces the `learningProgression.blockers` and
// `learningProgression.recommendations` arrays.

import { EvaluationReasoning } from '../db';
import { getLevel, MAX_FLN_LEVEL, nextLevelAfter } from '../curriculum';
import {
  BuildReasoningInput,
  FailedByLevelMap,
  uniqueSorted,
} from './shared';

export function buildBlockers(
  failedByLevel: FailedByLevelMap,
  aiEvaluation: BuildReasoningInput['aiEvaluation']
): EvaluationReasoning['learningProgression']['blockers'] {
  const blockers: EvaluationReasoning['learningProgression']['blockers'] = [];

  // Deterministic blockers: failures grouped by topic, in ascending level order.
  const sortedLevels = uniqueSorted(Array.from(failedByLevel.keys()));
  for (const lvl of sortedLevels) {
    const outcomes = failedByLevel.get(lvl)!;
    // De-duplicate by topic at this level.
    const topicsAtLevel = new Set<string>();
    for (const o of outcomes) {
      const topic = o.question.topic || 'General Mathematics';
      if (!topicsAtLevel.has(topic)) {
        topicsAtLevel.add(topic);
        blockers.push({ topic, questionId: o.question.question_id });
      }
    }
  }

  // If the AI evaluation surfaces typed root causes, surface them too (already
  // produced upstream — we do not invent them).
  if (aiEvaluation?.root_causes && Array.isArray(aiEvaluation.root_causes)) {
    for (const rc of aiEvaluation.root_causes) {
      if (!rc.topic) continue;
      const exists = blockers.some((b) => b.topic === rc.topic);
      const item: EvaluationReasoning['learningProgression']['blockers'][number] = {
        topic: rc.topic,
        errorType: rc.error_type,
      };
      if (rc.question_id) item.questionId = rc.question_id;
      if (!exists) blockers.push(item);
    }
  }

  return blockers;
}

export function buildRecommendations(
  input: BuildReasoningInput,
  failedByLevel: FailedByLevelMap,
  next: ReturnType<typeof nextLevelAfter>
): string[] {
  const recs: string[] = [];

  // Curriculum-grounded recommendations only.
  if (failedByLevel.size > 0) {
    const sortedLevels = uniqueSorted(Array.from(failedByLevel.keys()));
    const minLevel = sortedLevels[0];
    const minDesc = getLevel(minLevel);
    if (minDesc) {
      recs.push(`Start remediation at Level ${minLevel} (${minDesc.name}) in the strand: ${minDesc.strand}.`);
    }
    for (const lvl of sortedLevels.slice(0, 3)) {
      const desc = getLevel(lvl);
      if (desc) {
        recs.push(`Practice Level ${lvl} — ${desc.name}: ${desc.brief}`);
      }
    }
  } else {
    recs.push('Continue regular practice at the placed level to consolidate fluency.');
  }

  if (next) {
    recs.push(`Target the next curriculum milestone: Level ${next.id} (${next.name}) — ${next.brief}.`);
  } else {
    recs.push(`The placed level is the highest in the framework (Level ${MAX_FLN_LEVEL}); focus on mastery consolidation.`);
  }

  if (input.aiEvaluation?.recommendation) {
    recs.push(`Pipeline recommendation: ${input.aiEvaluation.recommendation}`);
  }

  if (input.aiEvaluation?.prerequisites_to_check && input.aiEvaluation.prerequisites_to_check.length > 0) {
    recs.push(`Check prerequisites: ${input.aiEvaluation.prerequisites_to_check.join('; ')}.`);
  }

  return recs;
}