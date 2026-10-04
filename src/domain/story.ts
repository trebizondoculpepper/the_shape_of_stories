import type { Card, Chapter } from './types';

/* ============================== CONSTANTS ============================== */

export const ACT_COLORS = { 1: '#eef3fb', 2: '#fbf7ea', 3: '#fbf0e3', 4: '#fbeaea', 5: '#f3eefb' };
// Stable hash so a thread's color depends on its name, not its position in the threads array —
// deleting/reordering other threads no longer shifts everyone else's color.
export function hashColorIndex(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
export const ACT_BORDERS = { 1: '#aac1ec', 2: '#ecda9d', 3: '#ecc399', 4: '#e8a8a8', 5: '#cbb2ec' };
export const UNASSIGNED_COLOR = '#f0eeec';
export const UNASSIGNED_BORDER = '#c9c4bd';
export const ACT_NAMES = { 1: 'Act I', 2: 'Act II', 3: 'Act III', 4: 'Act IV', 5: 'Act V' };
export const ACTS = [1, 2, 3, 4, 5];

export const BOLD_PALETTE = [
  { name: 'Blue', hex: '#86a6e4' },
  { name: 'Yellow', hex: '#e4cb74' },
  { name: 'Orange', hex: '#e4ab71' },
  { name: 'Red', hex: '#de8484' },
  { name: 'Purple', hex: '#b692e4' },
];
export const SOFT_PALETTE = [
  { name: 'Sage', hex: '#9fd1a3' },
  { name: 'Aqua', hex: '#82d1c9' },
  { name: 'Rose', hex: '#eea6c3' },
  { name: 'Lime', hex: '#cbdc8f' },
  { name: 'Stone', hex: '#cdc5b8' },
];
export const THREAD_COLOR_PALETTE = [
  { name: 'Violet', hex: '#7F77DD' },
  { name: 'Coral', hex: '#D85A30' },
  { name: 'Teal', hex: '#1D9E75' },
  { name: 'Pink', hex: '#D4537E' },
  { name: 'Amber', hex: '#BA7517' },
  { name: 'Blue', hex: '#378ADD' },
  { name: 'Green', hex: '#639922' },
  { name: 'Gray', hex: '#888780' },
];
export const THREAD_COLORS = THREAD_COLOR_PALETTE.map(p => p.hex);

export const CIRCLE_STAGES = ['You', 'Need', 'Go', 'Search', 'Find', 'Take', 'Return', 'Change'];

// Freytag's Pyramid, as background context bands on the Character Arcs chart — not a per-character
// value, just the classic dramatic-structure shape (short exposition, long rising action, a narrow
// climax, falling action, a short resolution). Proportions are a reasonable default, not tuned per story.
export const FREYTAG_ZONES = [
  { label: 'Exposition', from: 0, to: 0.15, fill: '#f2f2f2' },
  { label: 'Rising Action', from: 0.15, to: 0.70, fill: 'transparent' },
  { label: 'Climax', from: 0.70, to: 0.78, fill: '#f6f0fb' },
  { label: 'Falling Action', from: 0.78, to: 0.92, fill: 'transparent' },
  { label: 'Resolution', from: 0.92, to: 1, fill: '#f2f2f2' },
];

// (Emotion/Action/Theme tag types removed — tag type is now free text the user defines, see tagTypes lib.)

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function freshDefaultChapters() {
  return [{ id: uid(), title: 'Chapter 1' }];
}

export function freshDefaultCards(chapterId: string): Card[] {
  const mk = (title: string, act: number, placeholder: string): Card => ({
    id: uid(), act, gapIndex: null, chapterId, title, text: '', notes: '',
    tags: [], values: [], placeholder, customColor: null, major: false,
  });
  return [
    mk('Beginning', 1, 'What is the status quo before the story begins?'),
    mk('Inciting Incident', 1, 'What event disrupts the status quo and sets the story in motion?'),
    mk('Rising Action', 2, 'What complications escalate the conflict?'),
    mk('Climax', 3, 'What is the peak confrontation or decision?'),
    mk('Falling Action', 4, 'What are the immediate consequences of the climax?'),
    mk('Resolution', 5, 'How does the story settle?'),
    mk('Loose Ends', 5, 'What threads resolve or remain deliberately open?'),
  ];
}

// Filters a card list down to one chapter, or returns all cards when chapterId is 'all'.
export function filterByChapter<T extends { chapterId: string | null }>(cards: T[], chapterId: string): T[] {
  return chapterId === 'all' ? cards : cards.filter(c => c.chapterId === chapterId);
}

export const GENERIC_PLACEHOLDER = 'What change turns the plot?';

/* ============================== COLOR RESOLUTION ============================== */

export function darkenHex(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, Math.round(r * (1 - amt)));
  g = Math.max(0, Math.round(g * (1 - amt)));
  b = Math.max(0, Math.round(b * (1 - amt)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function resolveColor(card: Pick<Card, 'customColor' | 'act'>) {
  if (card.customColor) return card.customColor;
  if (card.act) return ACT_COLORS[card.act as keyof typeof ACT_COLORS];
  return UNASSIGNED_COLOR;
}
export function resolveBorder(card: Pick<Card, 'customColor' | 'act'>) {
  if (card.customColor) return darkenHex(card.customColor, 0.3);
  if (card.act) return ACT_BORDERS[card.act as keyof typeof ACT_BORDERS];
  return UNASSIGNED_BORDER;
}

/* ============================== VALUE CHAIN ============================== */

// When `chapters` is given, orders chapter-by-chapter then act-by-act within each chapter.
// Otherwise falls back to a flat act-only ordering (used once cards are already scoped to one chapter).
export function getOrderedForValues<T extends Pick<Card, 'id' | 'chapterId' | 'act'>>(cards: T[], chapters?: Pick<Chapter, 'id'>[]): T[] {
  if (chapters && chapters.length) {
    return chapters.flatMap(ch => ACTS.flatMap(act => cards.filter(c => c.chapterId === ch.id && c.act === act)));
  }
  return ACTS.flatMap(act => cards.filter(c => c.act === act));
}

// Chronological position of every card: chapter order, then act order, then array order; unplaced cards last.
export function chronoOrderMap<T extends Pick<Card, 'id' | 'chapterId' | 'act'>>(cards: T[], chapters?: Pick<Chapter, 'id'>[]) {
  const placed = getOrderedForValues(cards, chapters);
  const seen = new Set(placed.map(c => c.id));
  const m: Record<string, number> = {};
  [...placed, ...cards.filter(c => !seen.has(c.id))].forEach((c, i) => { m[c.id] = i; });
  return m;
}
// Sorts thread steps by story position and numbers them 1..n.
export function numberThreadSteps<T extends { cardId: string }>(steps: T[], order: Record<string, number>) {
  return [...steps].sort((a, b) => (order[a.cardId] ?? 1e9) - (order[b.cardId] ?? 1e9)).map((s, i) => ({ ...s, step: i + 1 }));
}

// Reorders `arr` by moving the card at idx by `dir` positions. If the moved card is
// currently unassigned, it adopts the act of its new neighbor(s) (before takes priority).
export function nudgeWithActAdoption<T extends { act?: number | null }>(arr: T[], idx: number, dir: number): T[] {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[idx], next[j]] = [next[j], next[idx]];
  const moved = next[j];
  if (moved.act === null || moved.act === undefined) {
    const before = next[j - 1];
    const after = next[j + 1];
    const inherited = before ? before.act : (after ? after.act : null);
    if (inherited !== null && inherited !== undefined) next[j] = { ...moved, act: inherited };
  }
  return next;
}

export function buildValueChain<T extends Pick<Card, 'id' | 'chapterId' | 'act' | 'values'>>(cards: T[], chapters?: Pick<Chapter, 'id'>[]) {
  const ordered = getOrderedForValues(cards, chapters);
  const openMap: Record<string, number> = {};
  const chain: Record<string, Record<string, { open: number; close: number; isEvent: boolean }>> = {};
  ordered.forEach(card => {
    chain[card.id] = {};
    (card.values || []).forEach(v => {
      const open = openMap[v.name] !== undefined ? openMap[v.name] : 0;
      const close = open + (v.shift || 0);
      chain[card.id][v.name] = { open, close, isEvent: (v.shift || 0) !== 0 };
      openMap[v.name] = close;
    });
  });
  return { chain, ordered };
}
