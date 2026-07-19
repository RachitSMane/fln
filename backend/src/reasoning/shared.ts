// Shared types and pure helpers used by every reasoning builder module.
// Kept tiny on purpose — anything specific to a builder belongs in that
// builder's own file.

import { EvaluationReasoning, Question } from '../db';

export interface BuildReasoningInput {
  studentName: string;
  score: number;
  totalQuestions: number;
  recommendedLevel: number;
  recommendedSubLevel?: number;
  questions: Question[];
  answers: { [questionId: string]: string };
  // Optional structured hints already produced by the AI pipeline (evaluation JSON).
  // We only surface them — never invent them. When absent, we fall back to the
  // purely deterministic topic-failure analysis.
  aiEvaluation?: {
    demonstrated_level?: string | number;
    boundary_level?: string | number;
    confidence_score?: number;
    assign_reason?: string;
    levels_failed?: number[];
    topics_to_focus?: string[];
    prerequisites_to_check?: string[];
    recommendation?: string;
    performance_by_difficulty?: Record<string, { correct?: number; attempted?: number }>;
    error_type?: string;
    root_causes?: { fln_level?: number; topic?: string; error_type?: string; analysis?: string; question_id?: string }[];
  } | null;
  // Optional context from the personalized evaluation pipeline, surfaced if
  // available so the UI can explain why questions were chosen.
  personalized?: {
    failedQuestionsReused: number;
    newLevelQuestionsAdded: number;
    targetPhrase: string | null;
    targetClass: number | null;
  } | null;
}

export interface QuestionOutcome {
  question: Question;
  isCorrect: boolean;
  submitted: string;
}

export type FailedByLevelMap = Map<number, QuestionOutcome[]>;

/**
 * Grade every question against the submitted answers.
 *
 * Comparison is case-insensitive and whitespace-trimmed — same as the
 * rest of the evaluation pipeline. Pure function; no side effects.
 */
export function gradeQuestions(
  questions: Question[],
  answers: { [questionId: string]: string }
): QuestionOutcome[] {
  return questions.map((q) => {
    const submitted = (answers[q.question_id] || '').trim().toLowerCase();
    const correct = (q.answer || '').trim().toLowerCase();
    return { question: q, isCorrect: submitted === correct, submitted };
  });
}

/**
 * Group failed outcomes by their question's `source_level`.
 *
 * Outcomes whose source_level is not a positive integer are dropped — they
 * have no place on the FLN framework.
 */
export function groupFailuresByLevel(outcomes: QuestionOutcome[]): FailedByLevelMap {
  const failedByLevel: FailedByLevelMap = new Map();
  for (const o of outcomes) {
    if (o.isCorrect) continue;
    const lvl = o.question.source_level;
    if (!Number.isFinite(lvl) || lvl < 1) continue;
    const arr = failedByLevel.get(lvl) || [];
    arr.push(o);
    failedByLevel.set(lvl, arr);
  }
  return failedByLevel;
}

/**
 * De-duplicate and ascending-sort a list of numeric levels.
 * Drops anything that is not a finite number.
 */
export function uniqueSorted(nums: number[]): number[] {
  return Array.from(new Set(nums.filter((n) => Number.isFinite(n)))).sort((a, b) => a - b);
}

/** Clamp a number into the [0, 1] range. NaN / non-finite → 0. */
export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Compute whole-percent mastery (0–100) from raw counts. */
export function masteryPercent(score: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((score / totalQuestions) * 100);
}

// Re-export the type aliases builders consume most so callers don't need
// to import from './db' directly.
export type { EvaluationReasoning, Question };