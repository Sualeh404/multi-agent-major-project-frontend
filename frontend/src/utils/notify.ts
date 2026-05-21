// Lightweight wrappers around document.title and the browser Notification
// API. The goal is to nudge users who alt-tabbed away during a long run —
// most synthesis takes 30s-2min and people will switch contexts.

const DEFAULT_TITLE = 'STEM Synthesis';

export function setTabTitle(text: string | null) {
  document.title = text ? `${text} — ${DEFAULT_TITLE}` : DEFAULT_TITLE;
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notifyComplete(query: string, status: 'completed' | 'failed') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Only fire when the tab is hidden — if the user is looking at the page
  // the in-app toast/UI already covers it.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
  try {
    new Notification(
      status === 'completed' ? 'Synthesis ready' : 'Synthesis failed',
      {
        body: query.slice(0, 140),
        icon: '/favicon.ico',
        tag: 'synthesis-complete',
      },
    );
  } catch {
    /* silent — some browsers throw without user gesture */
  }
}
