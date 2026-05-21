// Tracks total INR spent in a per-day rolling ledger backed by localStorage.

const KEY = 'stem-synth.spend.v1';

type Ledger = Record<string, number>; // YYYY-MM-DD → rupees

function load(): Ledger {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Ledger : {};
  } catch { return {}; }
}

function save(l: Ledger): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(l)); } catch {/* ignore */}
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// Records the *final* cost for a session id once, preventing double-counting.
const recordedKey = (sid: string) => `stem-synth.spend.seen.${sid}`;

export function recordFinalCost(sessionId: string, costInr: number): void {
  if (!sessionId || !costInr || costInr <= 0) return;
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(recordedKey(sessionId))) return; // already counted
    const l = load();
    const k = dayKey();
    l[k] = Number(((l[k] || 0) + costInr).toFixed(4));
    save(l);
    window.localStorage.setItem(recordedKey(sessionId), '1');
  } catch {/* ignore */}
}

export function todaySpend(): number {
  return load()[dayKey()] || 0;
}

export function allTimeSpend(): number {
  return Object.values(load()).reduce((a, b) => a + b, 0);
}

export function last7DaysSpend(): number {
  const l = load();
  let sum = 0;
  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    const k = dayKey(new Date(now - i * 86_400_000));
    sum += l[k] || 0;
  }
  return sum;
}
