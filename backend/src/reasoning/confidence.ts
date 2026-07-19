// Phase 4: Placement Confidence builder.
//
// Deterministic, no LLM, no invented probabilities. The score is the
// upstream pipeline `confidence_score` when the AI evaluation pipeline is
// available, otherwise raw accuracy.
//
//   1. If the AI evaluation pipeline produced its own `confidence_score`
//      (see ai-services/scripts/2_evaluate_child.py), we surface it
//      verbatim. The pipeline already produces this value with a clear
//      interpretation (see FLN thresholds 0.95 / 0.75 / 0.60 in the
//      Python code).
//
//   2. If no pipeline confidence is available (worksheet grading path,
//      fallback, mock), we derive from accuracy alone. This is the most
//      conservative, faithful signal available.
//
// The level thresholds are fixed (see below) — no statistical estimation,
// no calibration, no invented metrics.

import { EvaluationReasoning, ConfidenceLevel } from '../db';
import { BuildReasoningInput, clamp01 } from './shared';

export const CONFIDENCE_THRESHOLDS = {
  veryHigh: 0.9,
  high: 0.75,
  moderate: 0.5,
} as const;

export function deriveConfidenceScore(input: BuildReasoningInput): number {
  // Prefer the upstream pipeline's own confidence when available — the
  // Python script (`2_evaluate_child.py`) already accounts for question
  // difficulty and historical error rates.
  const upstream = input.aiEvaluation?.confidence_score;
  if (typeof upstream === 'number' && Number.isFinite(upstream)) {
    // The pipeline writes 0..1 floats; some legacy callers send 0..100.
    if (upstream > 1 && upstream <= 100) return clamp01(upstream / 100);
    return clamp01(upstream);
  }
  // Fallback: derive deterministically from accuracy alone. Conservative
  // by construction.
  if (input.totalQuestions <= 0) return 0;
  return clamp01(input.score / input.totalQuestions);
}

export function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.veryHigh) return 'Very High';
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'High';
  if (score >= CONFIDENCE_THRESHOLDS.moderate) return 'Moderate';
  return 'Low';
}

export function buildConfidenceExplanation(
  level: ConfidenceLevel,
  score: number,
  input: BuildReasoningInput,
  evidence: EvaluationReasoning['evidence']
): string {
  const lines: string[] = [];

  // Subject line — composed from the level only (deterministic phrasing).
  if (level === 'Very High') {
    lines.push('The student consistently demonstrated mastery across all assessed concepts.');
  } else if (level === 'High') {
    lines.push('The student demonstrated strong performance with only minor variations across assessed topics.');
  } else if (level === 'Moderate') {
    lines.push('The student showed mixed performance across assessed topics. A follow-up diagnostic is recommended.');
  } else {
    lines.push('Significant gaps were detected. Remediation should be prioritised before any progression.');
  }

  // Confidence headline — always present, deterministic.
  lines.push(`Placement confidence is ${level} (${Math.round(score * 100)}%).`);

  // Augment with existing evidence so the explanation references the data
  // the teacher already sees on the page. We never invent new signals.
  const weakest = evidence?.weakestConcepts ?? [];
  const totalFailed = evidence?.failedQuestionSummary?.total ?? 0;
  if (level === 'Low' && weakest.length > 0) {
    lines.push(`Areas requiring attention: ${weakest.slice(0, 3).join(', ')}.`);
  } else if (level === 'Moderate' && weakest.length > 0) {
    lines.push(`Areas needing reinforcement: ${weakest.slice(0, 3).join(', ')}.`);
  } else if (level === 'High' && totalFailed > 0) {
    lines.push(`A small number of items (${totalFailed}) did not meet the mastery threshold.`);
  }

  // Honest divergence note — when we surface an upstream pipeline
  // confidence that differs from raw accuracy, we tell the teacher.
  // This is deterministic and avoids hiding the pipeline's calibration.
  const upstream = input.aiEvaluation?.confidence_score;
  const totalQuestions = input.totalQuestions;
  const rawAccuracy = totalQuestions > 0
    ? Math.round((input.score / totalQuestions) * 100)
    : null;
  const scorePct = Math.round(score * 100);
  const upstreamValid =
    typeof upstream === 'number' && Number.isFinite(upstream) && upstream >= 0 && upstream <= 1;
  if (upstreamValid && rawAccuracy !== null && Math.abs(scorePct - rawAccuracy) > 1) {
    lines.push(
      `Note: pipeline confidence (${scorePct}%) differs from raw accuracy (${rawAccuracy}%) because the upstream evaluator calibrates against item difficulty.`
    );
  }

  return lines.join(' ');
}

export function buildConfidence(
  input: BuildReasoningInput,
  evidence: EvaluationReasoning['evidence']
): EvaluationReasoning['confidence'] {
  const score = deriveConfidenceScore(input);
  const level = classifyConfidence(score);
  return {
    score,
    level,
    explanation: buildConfidenceExplanation(level, score, input, evidence),
  };
}