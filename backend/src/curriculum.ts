// Single source of truth for the 59 FLN levels on the backend.
// Mirrors frontend/src/components/RoleDashboards.tsx FLN_LEVELS_LIST so
// that backend reasoning stays in sync with the framework shown to users.
//
// Do NOT invent new competencies here — only describe the existing
// curriculum progression.
//
// The long-form objective / learning outcome / topics for each level live
// in the FLN Levels Structure markdown files (../../FLN Levels Structure/).
// `curriculumLoader.ts` parses those at runtime and is the single source of
// truth for the rich curriculum details — this file intentionally does NOT
// duplicate that data.

export interface FLNLevelDescriptor {
  id: number;            // 1..59
  classGroup: string;     // "Preschool 1" | "Preschool 2" | "Preschool 3" | "Class 1" | ... | "Review"
  name: string;           // canonical level name
  strand: string;         // topic strand (Number Sense, Operations, etc.)
  brief: string;          // 1-line curriculum objective (drawn from the existing FLN Levels Structure)
}

export const MAX_FLN_LEVEL = 59;

export const FLN_LEVELS: FLNLevelDescriptor[] = [
  { id: 1, classGroup: 'Preschool 1', name: 'Quantity Comparison', strand: 'Number Sense', brief: 'Compare quantities using more / less / greater than.' },
  { id: 2, classGroup: 'Preschool 1', name: 'Odd One Out', strand: 'Number Sense', brief: 'Identify the item that does not belong in a group.' },
  { id: 3, classGroup: 'Preschool 1', name: 'Matching + Tracing Lines', strand: 'Shapes', brief: 'Match identical shapes and trace lines.' },
  { id: 4, classGroup: 'Preschool 2', name: 'Numbers 1-10', strand: 'Number Sense', brief: 'Recognise, read and write numerals 1–10.' },
  { id: 5, classGroup: 'Preschool 2', name: 'Finger Gesture Counting', strand: 'Number Sense', brief: 'Count quantities shown by finger gestures.' },
  { id: 6, classGroup: 'Preschool 2', name: 'After, Between, Before', strand: 'Number Sense', brief: 'Identify numbers after, between and before in a 1–10 sequence.' },
  { id: 7, classGroup: 'Preschool 3', name: 'Addition through objects', strand: 'Number Operations', brief: 'Combine two small groups of objects and count the total.' },
  { id: 8, classGroup: 'Preschool 3', name: 'Subtraction(1-10)', strand: 'Number Operations', brief: 'Take away a small quantity and count what remains.' },
  { id: 9, classGroup: 'Preschool 3', name: 'Pattern Recognition+Draw by Tracing', strand: 'Patterns', brief: 'Complete repeating shape and colour patterns.' },
  { id: 10, classGroup: 'Preschool 3', name: 'Comparison – Numeral', strand: 'Number Sense', brief: 'Identify the bigger of two single-digit numerals.' },
  { id: 11, classGroup: 'Review', name: 'Review Assessment', strand: 'Review', brief: 'Cumulative review of Preschool 1–3 objectives.' },

  { id: 12, classGroup: 'Class 1', name: 'Tens and Ones', strand: 'Number Sense', brief: 'Decompose numbers 11–30 into tens and ones.' },
  { id: 13, classGroup: 'Class 1', name: 'Numbers 11–30', strand: 'Number Sense', brief: 'Read, write and sequence numerals 11–30.' },
  { id: 14, classGroup: 'Class 1', name: 'Counting + Fun Trace', strand: 'Number Sense', brief: 'Match quantities to numerals 11–30.' },
  { id: 15, classGroup: 'Class 1', name: 'After, Between & Before', strand: 'Number Sense', brief: 'Place a number after, before or between two given values.' },
  { id: 16, classGroup: 'Class 1', name: 'Addition (1-30)', strand: 'Number Operations', brief: 'Solve single-digit additions within 30 without carry.' },
  { id: 17, classGroup: 'Class 1', name: 'Subtraction (1-30)', strand: 'Number Operations', brief: 'Solve subtractions within 30 without borrow.' },
  { id: 18, classGroup: 'Class 1', name: 'Ordering (1-30)', strand: 'Number Sense', brief: 'Arrange numbers 1–30 in ascending order.' },
  { id: 19, classGroup: 'Class 1', name: 'Numering 31-50', strand: 'Number Sense', brief: 'Read and write numerals 31–50.' },
  { id: 20, classGroup: 'Class 1', name: 'Skip Counting in 2s/3s', strand: 'Number Sense', brief: 'Continue skip-count sequences by 2 and by 3.' },
  { id: 21, classGroup: 'Class 1', name: 'Comparison (1-50)', strand: 'Number Sense', brief: 'Compare numbers 1–50 using greater than / less than.' },
  { id: 22, classGroup: 'Class 1', name: 'Ordering (1-50)', strand: 'Number Sense', brief: 'Arrange numbers 1–50 in descending order.' },
  { id: 23, classGroup: 'Review', name: 'Review Assessment', strand: 'Review', brief: 'Cumulative review of Class 1 objectives.' },

  { id: 24, classGroup: 'Class 2', name: 'Numbers 51-100', strand: 'Number Sense', brief: 'Read and write numerals 51–100.' },
  { id: 25, classGroup: 'Class 2', name: 'Place Value (Tens & Ones)', strand: 'Number Sense', brief: 'Identify the place value of digits in 2-digit numbers.' },
  { id: 26, classGroup: 'Class 2', name: 'Carry Addition', strand: 'Number Operations', brief: 'Solve two-digit additions with carrying.' },
  { id: 27, classGroup: 'Class 2', name: 'Borrow Subtraction', strand: 'Number Operations', brief: 'Solve two-digit subtractions with borrowing.' },
  { id: 28, classGroup: 'Class 2', name: 'Comparison (Greater Than, Less Than, Equal)', strand: 'Number Sense', brief: 'Compare two-digit numbers using comparison symbols.' },
  { id: 29, classGroup: 'Class 2', name: 'Ordering (Ascending & Descending)', strand: 'Number Sense', brief: 'Order numbers up to 100 in ascending and descending order.' },
  { id: 30, classGroup: 'Class 2', name: 'Data Handling (Tally Marks)', strand: 'Data Handling', brief: 'Read and record tally marks.' },
  { id: 31, classGroup: 'Class 2', name: 'Time', strand: 'Calendar & Time', brief: 'Tell time to the hour on an analog clock.' },
  { id: 32, classGroup: 'Class 2', name: 'Ordinal Positions (1st–10th)', strand: 'Number Sense', brief: 'Identify the position of an item in a sequence.' },
  { id: 33, classGroup: 'Class 2', name: 'Multiplication (Repeated Addition)', strand: 'Number Operations', brief: 'Express repeated addition as multiplication.' },
  { id: 34, classGroup: 'Class 2', name: 'Measurement (Non-Standard & Standard)', strand: 'Measurement', brief: 'Measure length using non-standard units (paperclips, etc.).' },
  { id: 35, classGroup: 'Review', name: 'Review Assessment', strand: 'Review', brief: 'Cumulative review of Class 2 objectives.' },

  { id: 36, classGroup: 'Class 3', name: 'Numbers 101–1000 (Place Value)', strand: 'Number Sense', brief: 'Identify the place value of hundreds, tens and ones.' },
  { id: 37, classGroup: 'Class 3', name: 'Comparison (Greater Than, Less Than, Equal)', strand: 'Number Sense', brief: 'Compare three-digit numbers using place value.' },
  { id: 38, classGroup: 'Class 3', name: 'Ordering (Ascending & Descending)', strand: 'Number Sense', brief: 'Arrange three-digit numbers in ascending and descending order.' },
  { id: 39, classGroup: 'Class 3', name: 'Addition (Up to 1000)', strand: 'Number Operations', brief: 'Solve additions with three-digit numbers.' },
  { id: 40, classGroup: 'Class 3', name: 'Subtraction (Up to 1000)', strand: 'Number Operations', brief: 'Solve subtractions with three-digit numbers.' },
  { id: 41, classGroup: 'Class 3', name: 'Multiplication (Tables 2–10)', strand: 'Number Operations', brief: 'Recall multiplication facts for tables 2–10.' },
  { id: 42, classGroup: 'Class 3', name: 'Division (Introduction)', strand: 'Number Operations', brief: 'Share quantities equally into given groups.' },
  { id: 43, classGroup: 'Class 3', name: 'Standard Measurement & Simple Conversions', strand: 'Measurement', brief: 'Convert between cm and m, g and kg, ml and l.' },
  { id: 44, classGroup: 'Class 3', name: 'Time & Calendar', strand: 'Calendar & Time', brief: 'Read calendar dates and quarter-hour times.' },
  { id: 45, classGroup: 'Class 3', name: 'Fractions', strand: 'Fractions', brief: 'Identify fractions of a whole and a collection.' },
  { id: 46, classGroup: 'Class 3', name: 'Money', strand: 'Money', brief: 'Count Indian currency and compute change.' },
  { id: 47, classGroup: 'Class 3', name: 'Data Handling', strand: 'Data Handling', brief: 'Interpret pictographs and simple bar graphs.' },
  { id: 48, classGroup: 'Review', name: 'Foundation Mastery Assessment', strand: 'Review', brief: 'Cumulative review of Class 3 objectives.' },

  { id: 49, classGroup: 'Class 4', name: 'Numbers up to 10,000', strand: 'Number Sense', brief: 'Identify the place value of digits up to 10,000.' },
  { id: 50, classGroup: 'Class 4', name: 'Advanced Multiplication', strand: 'Number Operations', brief: 'Multiply 2-digit by 2-digit and 3-digit by 1-digit numbers.' },
  { id: 51, classGroup: 'Class 4', name: 'Advanced Division', strand: 'Number Operations', brief: 'Perform long division including remainders.' },
  { id: 52, classGroup: 'Class 4', name: 'Maps & Directions', strand: 'Shapes', brief: 'Apply cardinal directions and spatial reasoning.' },
  { id: 53, classGroup: 'Class 4', name: 'Factors & Multiples', strand: 'Number Operations', brief: 'Identify factors and multiples of a number.' },
  { id: 54, classGroup: 'Class 4', name: 'Fraction Operations', strand: 'Fractions', brief: 'Add and subtract like fractions.' },
  { id: 55, classGroup: 'Class 4', name: 'Decimals (Introduction)', strand: 'Number Sense', brief: 'Express tenths and hundredths as decimals.' },
  { id: 56, classGroup: 'Class 4', name: 'Area & Perimeter', strand: 'Measurement', brief: 'Compute the area and perimeter of simple shapes.' },
  { id: 57, classGroup: 'Class 4', name: 'Angles', strand: 'Measurement', brief: 'Identify right, acute and obtuse angles.' },
  { id: 58, classGroup: 'Class 4', name: 'Symmetry & Reflection', strand: 'Shapes', brief: 'Identify lines of symmetry in 2D figures.' },
  { id: 59, classGroup: 'Review', name: 'Advanced Mastery Assessment', strand: 'Review', brief: 'Cumulative review of the full FLN framework.' },
];

const FLN_LEVEL_INDEX: Record<number, FLNLevelDescriptor> = FLN_LEVELS.reduce((acc, l) => {
  acc[l.id] = l;
  return acc;
}, {} as Record<number, FLNLevelDescriptor>);

export function getLevel(level: number): FLNLevelDescriptor | undefined {
  if (!Number.isFinite(level)) return undefined;
  const clamped = Math.max(1, Math.min(MAX_FLN_LEVEL, Math.floor(level)));
  return FLN_LEVEL_INDEX[clamped];
}

export function nextLevelAfter(level: number): FLNLevelDescriptor | null {
  const candidate = level + 1;
  if (candidate > MAX_FLN_LEVEL) return null;
  return getLevel(candidate);
}