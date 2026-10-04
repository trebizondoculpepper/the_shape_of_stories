// Shared geometry and stable placement for the two circle based views.
export function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function autoDistributeGaps(cards: Array<{ id: string }>): Record<string, number> {
  const n = cards.length;
  const gapIndexById: Record<string, number> = {};
  if (n === 0) return gapIndexById;
  const base = Math.floor(n / 8), extra = n % 8;
  let idx = 0;
  for (let g = 0; g < 8; g++) {
    const count = base + (g < extra ? 1 : 0);
    for (let k = 0; k < count; k++) {
      gapIndexById[cards[idx].id] = g;
      idx++;
    }
  }
  return gapIndexById;
}
