// Phase 2: evidence builder.
//
// Produces the `evidence` block: assessed topics, strongest / weakest
// concepts, failed-question summary, and (when present) a difficulty
// breakdown. Deterministic — uses question/answer outcomes plus, when
// available, the upstream AI evaluation pipeline's
// `performance_by_difficulty` / `topics_to_focus` / `levels_failed` as
// supplementary signals. We never invent values that are not in the
// pipeline or in the question metadata.

import { EvaluationReasoning, Question } from '../db';
import { getLevel } from '../curriculum';
import { BuildReasoningInput } from './shared';

export function buildEvidence(
  questions: Question[],
  answers: { [questionId: string]: string },
  aiEvaluation: BuildReasoningInput['aiEvaluation']
): EvaluationReasoning['evidence'] {
  const topicTotals = new Map<string, { correct: number; attempted: number }>();
  const levelFailures = new Map<number, number>();
  const difficultyMap: { easy: { correct: number; attempted: number }; medium: { correct: number; attempted: number }; hard: { correct: number; attempted: number } } = {
    easy: { correct: 0, attempted: 0 },
    medium: { correct: 0, attempted: 0 },
    hard: { correct: 0, attempted: 0 },
  };
  let totalFailed = 0;

  const normalizeDifficulty = (d: string | undefined): 'easy' | 'medium' | 'hard' | null => {
    if (!d) return null;
    const v = d.toLowerCase();
    if (v === 'easy' || v === 'e') return 'easy';
    if (v === 'medium' || v === 'm') return 'medium';
    if (v === 'hard' || v === 'h') return 'hard';
    return null;
  };

  for (const q of questions) {
    const topic = q.topic || 'General Mathematics';
    const submitted = (answers[q.question_id] || '').trim().toLowerCase();
    const correct = (q.answer || '').trim().toLowerCase();
    const isCorrect = submitted === correct;

    const t = topicTotals.get(topic) || { correct: 0, attempted: 0 };
    t.attempted += 1;
    if (isCorrect) t.correct += 1;
    topicTotals.set(topic, t);

    if (!isCorrect) {
      totalFailed += 1;
      const lvl = q.source_level;
      if (Number.isFinite(lvl) && lvl >= 1) {
        levelFailures.set(lvl, (levelFailures.get(lvl) || 0) + 1);
      }
    }

    const diff = normalizeDifficulty(q.difficulty);
    if (diff) {
      difficultyMap[diff].attempted += 1;
      if (isCorrect) difficultyMap[diff].correct += 1;
    }
  }

  // Strongest = topic where every attempt was correct.
  // Weakest = topic where at least one attempt was wrong.
  const strongestConcepts: string[] = [];
  const weakestConcepts: string[] = [];
  const conceptMastery: { [topic: string]: 'Strong' | 'Needs Practice' | 'Satisfactory' } = {};
  for (const [topic, agg] of topicTotals.entries()) {
    if (agg.attempted > 0 && agg.correct === agg.attempted) strongestConcepts.push(topic);
    if (agg.correct < agg.attempted) weakestConcepts.push(topic);
    if (agg.attempted > 0) {
      conceptMastery[topic] = agg.correct === agg.attempted
        ? 'Strong'
        : agg.correct === 0
        ? 'Needs Practice'
        : 'Satisfactory';
    }
  }
  strongestConcepts.sort();
  weakestConcepts.sort();

  // Surface any topics the upstream pipeline flagged even when we did not
  // see failures for them in this submission — they are already produced
  // upstream and worth reporting.
  if (aiEvaluation?.topics_to_focus && Array.isArray(aiEvaluation.topics_to_focus)) {
    for (const t of aiEvaluation.topics_to_focus) {
      if (typeof t === 'string' && !weakestConcepts.includes(t)) weakestConcepts.push(t);
    }
    weakestConcepts.sort();
  }

  const byLevel: Array<{ level: number; name: string | null; count: number; pipelineReported?: boolean }> = Array.from(levelFailures.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({
      level,
      name: getLevel(level)?.name ?? null,
      count,
    }));

  // Include levels the pipeline says were failed even if we did not see a
  // question at that level in this submission. We mark these entries with
  // `pipelineReported: true` so the UI can distinguish "no local failures
  // observed" from "one local failure observed" — without implying a count
  // of zero actually happened.
  if (aiEvaluation?.levels_failed && Array.isArray(aiEvaluation.levels_failed)) {
    for (const lvl of aiEvaluation.levels_failed) {
      if (!byLevel.some((x) => x.level === lvl)) {
        byLevel.push({ level: lvl, name: getLevel(lvl)?.name ?? null, count: 0, pipelineReported: true });
      }
    }
    byLevel.sort((a, b) => a.level - b.level);
  }

  const byTopic = Array.from(topicTotals.entries())
    .filter(([, agg]) => agg.correct < agg.attempted)
    .map(([topic, agg]) => ({ topic, count: agg.attempted - agg.correct }))
    .sort((a, b) => b.count - a.count);

  const assessedTopics = Array.from(new Set(questions.map((q) => q.topic || 'General Mathematics'))).sort();

  // Prefer the pipeline's per-difficulty counts when available — they
  // reflect the upstream evaluator's calibration. Fall back to our
  // local derivation otherwise.
  let difficultyBreakdown = difficultyMap;
  const perf = aiEvaluation?.performance_by_difficulty;
  if (perf && typeof perf === 'object') {
    const get = (k: 'easy' | 'medium' | 'hard'): { correct: number; attempted: number } => {
      const v = perf[k] as { correct?: number; attempted?: number } | undefined;
      return {
        correct: typeof v?.correct === 'number' ? v.correct : 0,
        attempted: typeof v?.attempted === 'number' ? v.attempted : 0,
      };
    };
    difficultyBreakdown = {
      easy: get('easy'),
      medium: get('medium'),
      hard: get('hard'),
    };
  }

  return {
    assessedTopics,
    strongestConcepts,
    weakestConcepts,
    failedQuestionSummary: {
      total: totalFailed,
      byLevel,
      byTopic,
    },
    difficultyBreakdown,
    conceptMastery,
  };
}