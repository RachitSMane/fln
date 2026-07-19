// Curriculum loader for FLN Levels Structure.
//
// The repository's single source of truth for the FLN curriculum is the set
// of `Level N_*.md` files under `<repo-root>/FLN Levels Structure/`. This
// module loads and parses them at runtime so the backend never duplicates
// curriculum metadata.
//
// `curriculum.ts` only contains the lightweight framework metadata
// (class / name / strand / brief) used by the frontend FLN_LEVELS_LIST —
// it explicitly does NOT embed rich per-level data. Rich details
// (objective, learning outcome, topics covered) come from this loader.
//
// The loader is fully lazy and cached:
//   - File reads happen on first access to each level.
//   - Parsed results are cached in-memory forever.
//   - All missing-file / parse-failure cases return safe empty defaults
//     so the calling reasoning pipeline never crashes.

import { promises as fs, statSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MAX_FLN_LEVEL = 59;

export interface FLNCurriculumLevel {
  level: number;
  objective: string;
  description: string;
  learningOutcome: string[];
  topics: string[];
}

const EMPTY: Omit<FLNCurriculumLevel, 'level'> = {
  objective: '',
  description: '',
  learningOutcome: [],
  topics: [],
};

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function candidateRoots(): string[] {
  const roots: string[] = [];
  // 1. Relative to this source file (works in both dev and production
  //    bundle where backend is built into dist/).
  roots.push(path.resolve(__dirname, '..', '..', 'FLN Levels Structure'));
  // 2. Relative to the backend package root.
  roots.push(path.resolve(__dirname, '..', 'FLN Levels Structure'));
  // 3. Relative to process cwd (covers unusual layouts).
  if (process.cwd) {
    roots.push(path.resolve(process.cwd(), 'FLN Levels Structure'));
    roots.push(path.resolve(process.cwd(), '..', 'FLN Levels Structure'));
  }
  // 4. Environment override.
  if (process.env.FLN_CURRICULUM_DIR) {
    roots.unshift(process.env.FLN_CURRICULUM_DIR);
  }
  // De-duplicate while preserving order.
  return Array.from(new Set(roots));
}

let resolvedRoot: string | null = null;

function resolveRoot(): string | null {
  if (resolvedRoot) return resolvedRoot;
  // We do lazy sync resolution because this runs at module load. We can
  // afford sync fs here — it's a single stat per candidate, only once.
  for (const candidate of candidateRoots()) {
    try {
      const stat = statSync(candidate);
      if (stat.isDirectory()) {
        resolvedRoot = candidate;
        return resolvedRoot;
      }
    } catch {
      // Try the next candidate.
    }
  }
  resolvedRoot = null;
  return null;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function cleanLine(s: string): string {
  return stripMarkdown(s)
    .replace(/^\s*-{3,}\s*$/g, '')
    .replace(/\s*-{3,}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extracts the body of a section whose CORE heading text is `headingCore`.
// Accepts any of:  ## Core text  /  ### Core text  /  **Core text** /
// **Core text:**. Section body ends at the next section boundary
// (next heading, bold-only pseudo-heading, `---` rule, or end-of-input).
//
// We deliberately do NOT use the `m` flag — `$` only matches end-of-string,
// which lets the non-greedy body capture span multiple lines without
// stopping at every newline.
function extractSection(text: string, headingCore: string): string | null {
  const escaped = headingCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,6}\\s+|\\*{2,}\\s*)?\\*{0,2}\\s*${escaped}\\*{0,2}\\s*:?\\s*\\n+([\\s\\S]*?)(?=\\n\\s*(?:#{1,6}\\s|\\*{2,}[^*]*\\*{2,}\\s*:?(?:\\n|$)|---|\\*\\*\\*\\*)|$)`,
    'i'
  );
  const m = text.match(re);
  if (!m) return null;
  return stripMarkdown(m[1]).replace(/^\s*-{3,}\s*$/gm, '');
}

function splitBullets(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*+]\s+/, '').trim())
    .filter((l) => l.length > 0 && !/^---+$/.test(l))
    .filter((l) => !/^SECTION\s+[A-Z]\s*:/i.test(l))
    .filter((l) => !/^\*?\*?Topics Covered\*?\*?$/i.test(l.trim()))
    .filter((l) => !/^\*?\*?Learning Outcome\(s\)?\*?\*?$/i.test(l))
    .filter((l, i, arr) => i === 0 || l !== arr[i - 1]);
}

function parseLevelMarkdown(text: string): Omit<FLNCurriculumLevel, 'level'> {
  const objectiveRaw = extractSection(text, 'Objective');
  const descriptionRaw = extractSection(text, 'Description');
  let learningOutcomeRaw = extractSection(text, 'Learning Outcome');
  if (!learningOutcomeRaw) learningOutcomeRaw = extractSection(text, 'Learning Outcomes');
  const topicsRaw = extractSection(text, 'Topics Covered');

  let objective = objectiveRaw ? cleanLine(objectiveRaw.split(/\r?\n/).join(' ')) : '';
  if (objective) {
    objective = objective
      .split(/Students can|By the end/i)[0]
      .trim()
      .replace(/[.;]?$/, '');
    objective = objective.replace(/\s*SECTION\s+[A-Z].*$/i, '').trim();
    objective = objective.replace(/[.;]?$/, '');
  }

  const description = descriptionRaw ? cleanLine(descriptionRaw.split(/\r?\n/).join(' ')) : '';

  let learningOutcome: string[] = [];
  if (learningOutcomeRaw) {
    learningOutcome = splitBullets(learningOutcomeRaw)
      .map((l) => cleanLine(l))
      .filter(
        (l) =>
          !/^Students can:?$/i.test(l) &&
          !/^By the end of this level,? the child will be able to:?$/i.test(l) &&
          !/^the child will be able to:?$/i.test(l) &&
          !/^child will:?$/i.test(l)
      );
  }

  const topics = topicsRaw
    ? splitBullets(topicsRaw).map((l) => cleanLine(l)).filter((l) => l.length > 0)
    : [];

  return {
    objective: objective || '',
    description: description || '',
    learningOutcome,
    topics,
  };
}

// ---------------------------------------------------------------------------
// File discovery + load (per level, cached)
// ---------------------------------------------------------------------------

const LEVEL_CACHE: Map<number, FLNCurriculumLevel> = new Map();
const INFLIGHT: Map<number, Promise<FLNCurriculumLevel>> = new Map();

function findMainLevelFileSync(rootDir: string, level: number): string | null {
  let entries: import('fs').Dirent[];
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!/Level\s*\d+/i.test(e.name)) continue;
    // Inside the directory, find the main `Level <n> *.md` file. We accept
    // any file whose name starts with "Level <n>" followed by `_`, ` `, or `.`
    // and ends in `.md`.
    const inner = readdirSync(path.join(rootDir, e.name), { withFileTypes: true });
    const main = inner.find(
      (x) =>
        x.isFile() &&
        new RegExp(`^Level\\s*${level}(?:[_\\s.]|$)`, 'i').test(x.name) &&
        x.name.toLowerCase().endsWith('.md')
    );
    if (!main) continue;
    const levelMatch = e.name.match(/Level\s*(\d+)/i);
    if (!levelMatch) continue;
    if (parseInt(levelMatch[1], 10) !== level) continue;
    return path.join(rootDir, e.name, main.name);
  }
  return null;
}

export async function loadCurriculumLevel(level: number): Promise<FLNCurriculumLevel> {
  if (!Number.isFinite(level)) {
    return { level: NaN, ...EMPTY };
  }
  const clamped = Math.max(1, Math.min(MAX_FLN_LEVEL, Math.floor(level)));
  const cached = LEVEL_CACHE.get(clamped);
  if (cached) return cached;
  const inflight = INFLIGHT.get(clamped);
  if (inflight) return inflight;

  const promise = (async () => {
    const root = resolveRoot();
    if (!root) {
      // Curriculum directory not found at runtime — return empty record
      // so callers degrade gracefully (narrative fallback still works).
      return { level: clamped, ...EMPTY };
    }
    const file = findMainLevelFileSync(root, clamped);
    if (!file) {
      return { level: clamped, ...EMPTY };
    }
    let text = '';
    try {
      text = await fs.readFile(file, 'utf-8');
    } catch {
      return { level: clamped, ...EMPTY };
    }
    const parsed = parseLevelMarkdown(text);
    return { level: clamped, ...parsed };
  })();

  INFLIGHT.set(clamped, promise);
  try {
    const result = await promise;
    LEVEL_CACHE.set(clamped, result);
    return result;
  } finally {
    INFLIGHT.delete(clamped);
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers (all async because parsing is async)
// ---------------------------------------------------------------------------

export async function getCurriculumLevel(level: number): Promise<FLNCurriculumLevel> {
  return loadCurriculumLevel(level);
}

export async function getCurrentObjective(level: number): Promise<string> {
  return (await loadCurriculumLevel(level)).objective;
}

export async function getCurrentDescription(level: number): Promise<string> {
  return (await loadCurriculumLevel(level)).description;
}

export async function getLearningOutcome(level: number): Promise<string[]> {
  return (await loadCurriculumLevel(level)).learningOutcome;
}

export async function getTopics(level: number): Promise<string[]> {
  return (await loadCurriculumLevel(level)).topics;
}

// Synchronous variant: returns cached entry only (never reads from disk).
// Useful for hot paths that have already pre-warmed the cache.
export function getCurriculumLevelSync(level: number): FLNCurriculumLevel | null {
  if (!Number.isFinite(level)) return null;
  const clamped = Math.max(1, Math.min(MAX_FLN_LEVEL, Math.floor(level)));
  return LEVEL_CACHE.get(clamped) ?? null;
}

// Pre-warm the cache for all 59 levels in the background. Intended for
// server startup. Failures are swallowed; first-access lazy loading will
// still work.
export async function preloadAllCurriculumLevels(): Promise<void> {
  await Promise.all(
    Array.from({ length: MAX_FLN_LEVEL }, (_, i) => loadCurriculumLevel(i + 1))
  );
}

// Cache statistics — useful for tests and /debug endpoints.
export function curriculumCacheStats(): { size: number; root: string | null } {
  return {
    size: LEVEL_CACHE.size,
    root: resolvedRoot,
  };
}