// Phase 1: explanation builder.
//
// Produces the `explanation.headline` + `explanation.narrative` strings.
// Deterministic — uses only the input, the curriculum descriptors, and the
// question/answer evidence.

import { getLevel } from '../curriculum';
import {
  BuildReasoningInput,
  FailedByLevelMap,
  masteryPercent,
  uniqueSorted,
} from './shared';

export function buildHeadline(input: BuildReasoningInput, currentName: string, masteryPct: number): string {
  const lvl = input.recommendedLevel;
  if (masteryPct >= 90) {
    return `Strong performance across the FLN framework — placed at ${currentName}.`;
  }
  if (masteryPct >= 60) {
    return `Solid foundation with focused practice needed — placed at ${currentName}.`;
  }
  return `Foundational gaps identified at Level ${lvl} (${currentName}) — remediation recommended before progressing.`;
}

export function buildNarrative(
  input: BuildReasoningInput,
  failedByLevel: FailedByLevelMap,
  currentName: string
): string {
  const lines: string[] = [];
  const masteryPct = masteryPercent(input.score, input.totalQuestions);
  const sub = input.recommendedSubLevel ?? 0;
  const subLabel = sub === 0 ? 'mastery' : sub === 1 ? 'easier (partial mastery)' : 'remedial (re-teach)';

  lines.push(
    `Student scored ${input.score} / ${input.totalQuestions} (${masteryPct}%). ` +
      `Based on the existing FLN framework, ${input.studentName} is placed at Level ${input.recommendedLevel} (${currentName}), sub-level ${sub} (${subLabel}).`
  );

  if (failedByLevel.size > 0) {
    const sortedLevels = uniqueSorted(Array.from(failedByLevel.keys()));
    const summary = sortedLevels.slice(0, 5).map((l) => {
      const desc = getLevel(l);
      const count = failedByLevel.get(l)!.length;
      return `L${l}${desc ? ` (${desc.name})` : ''}: ${count}`;
    }).join(', ');
    lines.push(
      `Failures cluster around ${summary}. The "Minimum Failure Level" rule places the student at the lowest failing level, since higher levels depend on these foundations.`
    );
  } else {
    lines.push('No wrong answers recorded at the tested levels — placement reflects the highest demonstrated level.');
  }

  if (input.aiEvaluation?.assign_reason) {
    lines.push(`Assignment reason (from evaluation pipeline): ${input.aiEvaluation.assign_reason}.`);
  }

  return lines.join(' ');
}