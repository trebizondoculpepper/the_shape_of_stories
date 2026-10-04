
/* ============================== WORD COUNT ============================== */

export function parseWords(v: string | number) {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
export function fmtWords(n: number) { return Math.round(n).toLocaleString('en-GB'); }

// Unwritten scenes share whatever is left of the goal (after manual scene targets), so the split
// re-balances as written scenes come in over or under their share.
type WordCard = { words?: number | null; wordTarget?: number | null };

export function wordStats(cards: WordCard[], goal: number) {
  const isWritten = (c: WordCard) => (c.words || 0) > 0;
  const manual = (c: WordCard) => (c.wordTarget || 0) > 0;
  const total = cards.reduce((n, c) => n + (c.words || 0), 0);
  const unwritten = cards.filter(c => !isWritten(c));
  const auto = unwritten.filter(c => !manual(c));
  const manualSum = unwritten.filter(manual).reduce((n, c) => n + (c.wordTarget || 0), 0);
  const remaining = goal > 0 ? Math.max(0, goal - total) : 0;
  const autoEach = goal > 0 && auto.length ? Math.max(0, remaining - manualSum) / auto.length : 0;
  const targetOf = (c: WordCard) => manual(c) ? c.wordTarget : (!isWritten(c) && goal > 0 ? Math.round(autoEach) : null);
  return { total, goal, remaining, unwrittenCount: unwritten.length, autoCount: auto.length, autoEach, writtenCount: cards.length - unwritten.length, targetOf };
}
