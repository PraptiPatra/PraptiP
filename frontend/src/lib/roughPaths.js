// Deterministic seeded random for consistent rough paths
export function createRng(seed = 42) {
  let state = Math.abs(seed) + 1;
  return (range = 2) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return ((state / 0x7fffffff) - 0.5) * range;
  };
}

export function roughLine(x1, y1, x2, y2, rng, jitter = 2) {
  const r = rng || (() => 0);
  const mx = (x1 + x2) / 2 + r(jitter * 2);
  const my = (y1 + y2) / 2 + r(jitter * 2);
  return `M ${x1 + r(jitter)} ${y1 + r(jitter)} Q ${mx} ${my} ${x2 + r(jitter)} ${y2 + r(jitter)}`;
}

export function roughRect(x, y, w, h, rng, jitter = 1.5) {
  const r = rng || (() => 0);
  return [
    `M ${x + r(jitter)} ${y + r(jitter)}`,
    `Q ${x + w / 2 + r(jitter)} ${y + r(jitter)} ${x + w + r(jitter)} ${y + r(jitter)}`,
    `Q ${x + w + r(jitter)} ${y + h / 2 + r(jitter)} ${x + w + r(jitter)} ${y + h + r(jitter)}`,
    `Q ${x + w / 2 + r(jitter)} ${y + h + r(jitter)} ${x + r(jitter)} ${y + h + r(jitter)}`,
    `Q ${x + r(jitter)} ${y + h / 2 + r(jitter)} ${x + r(jitter)} ${y + r(jitter)}`,
  ].join(" ");
}

export function roughUnderline(x, y, width, rng, jitter = 2) {
  const r = rng || (() => 0);
  return roughLine(x, y, x + width, y + r(jitter), rng, jitter);
}

export function roughArrowPath(x1, y1, x2, y2, rng) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12;
  const headAngle = Math.PI / 5;

  const line = roughLine(x1, y1, x2, y2, rng, 2);
  const h1x = x2 - headLen * Math.cos(angle - headAngle);
  const h1y = y2 - headLen * Math.sin(angle - headAngle);
  const h2x = x2 - headLen * Math.cos(angle + headAngle);
  const h2y = y2 - headLen * Math.sin(angle + headAngle);

  return { line, head: `M ${h1x} ${h1y} L ${x2} ${y2} L ${h2x} ${h2y}` };
}

export function roughCheckmark(x, y, size = 16) {
  return `M ${x} ${y + size * 0.5} L ${x + size * 0.35} ${y + size * 0.8} L ${x + size} ${y + size * 0.15}`;
}

export function roughCross(x, y, size = 14) {
  return [
    `M ${x + 1} ${y + 1} L ${x + size - 1} ${y + size - 1}`,
    `M ${x + size - 1} ${y + 1} L ${x + 1} ${y + size - 1}`,
  ].join(" ");
}
