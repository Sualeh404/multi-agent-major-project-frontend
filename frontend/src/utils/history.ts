// Persistent client-side history of recent synthesis sessions. Backend
// sessions expire after 1h, but the local list survives refresh and lets
// the user revisit completed sessions via ?session=<id>.

const KEY = 'stem-synth.recent.v1';
const MAX = 20;

export interface RecentSession {
  sessionId: string;
  query: string;
  status: 'completed' | 'failed' | 'retrieval_failed' | 'processing' | 'awaiting_approval';
  ts: number; // ms
}

export function loadRecent(): RecentSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecent(list: RecentSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* localStorage may be unavailable in some browsers */
  }
}

export function upsertRecent(entry: RecentSession): RecentSession[] {
  const list = loadRecent().filter((r) => r.sessionId !== entry.sessionId);
  list.unshift(entry);
  const trimmed = list.slice(0, MAX);
  saveRecent(trimmed);
  return trimmed;
}

export function removeRecent(sessionId: string): RecentSession[] {
  const next = loadRecent().filter((r) => r.sessionId !== sessionId);
  saveRecent(next);
  return next;
}
