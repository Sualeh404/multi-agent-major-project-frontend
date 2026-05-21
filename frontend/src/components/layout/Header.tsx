import { Moon, Sun, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useToastStore } from '@/stores/toastStore';

export function Header() {
  const { darkMode, toggleDarkMode } = useUIStore();
  const { reset, status, sessionId } = useSynthesisStore();
  const addToast = useToastStore((s) => s.addToast);
  const canReset = status !== 'idle';
  const canShare = !!sessionId && (status === 'completed' || status === 'retrieval_failed');

  const onShare = async () => {
    if (!sessionId) return;
    const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast('Share link copied — note that sessions expire after 1 hour.', 'success');
    } catch {
      addToast(`Copy this link manually: ${url}`, 'info');
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          STEM Synthesis
        </h1>

        <div className="flex items-center gap-1">
          {canShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              aria-label="Copy share link"
              title="Copy a link to this synthesis (expires when session times out)"
              className="gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}
          {canReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              aria-label="Start a new query"
              title="New query — clears the current session"
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New query</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
