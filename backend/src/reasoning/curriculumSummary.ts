// Phase 3: curriculum summary builder.
//
// Surfaces structured curriculum information from the FLN Levels Structure
// markdown via the curriculum loader. We never invent curriculum content
// here — if the cached details for a level are not available, this
// function returns null and the calling code falls back gracefully.

import { EvaluationReasoning } from '../db';
import { getLevel, nextLevelAfter, FLNLevelDescriptor } from '../curriculum';
import {
  getCurriculumLevelSync,
  FLNCurriculumLevel,
} from '../curriculumLoader';

function trimSentence(s: string): string {
  return s.replace(/\s+/g, ' ').trim().replace(/[.;]?$/, '.');
}

interface FLNCurriculumSummaryInput {
  current: FLNLevelDescriptor | undefined;
  next: ReturnType<typeof nextLevelAfter>;
  currentDetails: FLNCurriculumLevel | null;
  nextDetails: FLNCurriculumLevel | null;
  masteryPct: number;
}

function buildTransitionReason(
  input: FLNCurriculumSummaryInput
): string {
  if (!input.current) {
    return '';
  }
  // Deterministic explanation — uses only the data already on the report
  // plus the curriculum summary itself.
  const parts: string[] = [];
  parts.push(
    `The student has demonstrated the learning outcomes required for ${input.current.name}.`
  );
  if (input.next && input.nextDetails?.objective) {
    parts.push(
      `The next curriculum milestone introduces ${input.next.name}.`
    );
    parts.push(`Its objective: ${trimSentence(input.nextDetails.objective)}.`);
  } else if (input.next) {
    parts.push(
      `The next curriculum milestone introduces ${input.next.name}.`
    );
  } else {
    parts.push(
      `This is the highest level in the framework — focus on mastery consolidation.`
    );
  }
  parts.push(
    `The teacher should complete the current learning outcomes before attempting ${input.next ? `Level ${input.next.id} (${input.next.name})` : 'the next level'}.`
  );
  return parts.join(' ');
}

export function buildCurriculumSummary(
  recommendedLevel: number,
  nextLevelId: number | null,
  masteryPct: number
): EvaluationReasoning['curriculumSummary'] | null {
  // The lightweight descriptor (always available — inline in curriculum.ts).
  const current = getLevel(recommendedLevel);
  const next = nextLevelId !== null ? getLevel(nextLevelId) ?? null : null;

  // The long-form details (loaded from FLN Levels Structure at runtime).
  const currentDetails = getCurriculumLevelSync(recommendedLevel);
  const nextDetails = nextLevelId !== null
    ? getCurriculumLevelSync(nextLevelId)
    : null;

  // If we have no details for the current level, there is nothing useful to
  // surface in the curriculum summary. Return null so the caller can omit
  // the block (keeps the report shape unchanged for legacy consumers).
  if (!currentDetails || (!currentDetails.objective && currentDetails.topics.length === 0 && currentDetails.learningOutcome.length === 0)) {
    return null;
  }

  return {
    currentLevelName: current?.name ?? `Level ${recommendedLevel}`,
    currentObjective: currentDetails.objective,
    currentLearningOutcome: currentDetails.learningOutcome,
    currentTopics: currentDetails.topics,
    nextLevelName: next?.name ?? null,
    nextObjective: nextDetails?.objective ?? null,
    transitionReason: buildTransitionReason({
      current,
      next,
      currentDetails,
      nextDetails,
      masteryPct,
    }),
  };
}