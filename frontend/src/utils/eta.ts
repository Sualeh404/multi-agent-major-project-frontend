// ETA estimation backed by localStorage of past run durations.
// Per-node averages let us predict remaining time more accurately than a
// single global "typical run takes ~90s" number.

const KEY = 'stem-synth.timings.v1';
const NODE_ORDER = ['retrieve_and_chunk', 'extract_methodology', 'adversarial_audit', 'compile_synthesis'];
const DEFAULTS: Record<string, number> = {
  retrieve_and_chunk: 15,
  extract_methodology: 12,
  adversarial_audit: 18,
  compile_synthesis: 20,
};

interface Stored {
  // node → list of recent durations in seconds (cap 20)
  durations: Record<string, number[]>;
}

function load(): Stored {
  if (typeof window === 'undefined') return { durations: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { durations: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Stored;
  } catch { /* ignore */ }
  return { durations: {} };
}

function save(s: Stored): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function recordNodeDuration(node: string, seconds: number): void {
  const s = load();
  const arr = s.durations[node] || [];
  arr.push(Math.max(1, Math.round(seconds)));
  s.durations[node] = arr.slice(-20);
  save(s);
}

function avg(node: string): number {
  const s = load();
  const arr = s.durations[node];
  if (!arr || arr.length === 0) return DEFAULTS[node] ?? 15;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export function totalExpected(): number {
  return NODE_ORDER.reduce((sum, n) => sum + avg(n), 0);
}

export function expectedRemaining(completedNodes: Set<string>, elapsedSeconds: number): number {
  // Sum the avg of nodes not yet done. If a node is in-flight (current
  // elapsed exceeds the expected for completed ones), shave by that.
  let remaining = 0;
  for (const node of NODE_ORDER) {
    if (!completedNodes.has(node)) remaining += avg(node);
  }
  const completedExpected = Array.from(completedNodes).reduce((s, n) => s + avg(n), 0);
  // If we're behind schedule on completed nodes, don't penalize the future too much.
  const overrun = Math.max(0, elapsedSeconds - completedExpected);
  return Math.max(5, remaining - overrun);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}
