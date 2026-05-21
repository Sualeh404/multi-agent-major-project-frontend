import { useEffect } from 'react';

// Register global keyboard shortcuts. We avoid heavy deps (Mousetrap etc.)
// because the matrix is small. Shortcuts are skipped while the user is
// typing in an input, textarea, or contenteditable region — except for
// the explicit overrides like Cmd/Ctrl+Enter to submit.

type Handler = (e: KeyboardEvent) => void;

interface Shortcut {
  combo: string;          // e.g. "/", "cmd+enter", "esc", "?"
  handler: Handler;
  allowInInput?: boolean; // override the typing-guard
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const needsCmd = parts.includes('cmd') || parts.includes('meta');
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');

  // Treat cmd+X and ctrl+X interchangeably so mac/windows users share bindings.
  const modOk = needsCmd || needsCtrl ? (e.metaKey || e.ctrlKey) : (!e.metaKey && !e.ctrlKey);
  if (!modOk) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsAlt !== e.altKey) return false;

  if (key === 'enter') return e.key === 'Enter';
  if (key === 'esc') return e.key === 'Escape';
  if (key === '?') return e.key === '?';
  if (key === '/') return e.key === '/';
  return e.key.toLowerCase() === key;
}

export function useShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target);
      for (const s of shortcuts) {
        if (!matches(e, s.combo)) continue;
        if (typing && !s.allowInInput) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}
