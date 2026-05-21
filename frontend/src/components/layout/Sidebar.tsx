import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Activity, Database, HelpCircle, Clock, Home, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { cn } from '@/utils/cn';
import { loadRecent, removeRecent, type RecentSession } from '@/utils/history';
import { useRoute, setQueryParam } from '@/utils/route';

const navItems = [
  { id: 'result', icon: BookOpen, label: 'Synthesis' },
  { id: 'sources', icon: Database, label: 'Sources' },
  { id: 'telemetry', icon: Activity, label: 'Telemetry' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar() {
  // Default to collapsed on narrow viewports so the synthesis area gets the
  // available width on phones/small laptops. The user can still expand.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  const { activeTab, setActiveTab } = useUIStore();
  const { restoreSession, sessionId, status } = useSynthesisStore();
  const [, navigate] = useRoute();
  const [recent, setRecent] = useState<RecentSession[]>([]);

  // Refresh the recent list whenever a session completes or storage changes
  useEffect(() => {
    setRecent(loadRecent());
    const onStorage = () => setRecent(loadRecent());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [sessionId, status]);

  const openSession = async (sid: string) => {
    setQueryParam('session', sid);
    await restoreSession(sid);
    setActiveTab('result');
  };

  const dropSession = (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecent(removeRecent(sid));
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'bg-card border-r border-border',
        'flex flex-col sticky top-0 h-screen'
      )}
    >
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          <button
            onClick={() => navigate('/home')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            title="Home"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                  Home
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as typeof activeTab)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-colors duration-200',
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </nav>

        {!collapsed && recent.length > 0 && (
          <div className="mt-6 px-2">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</span>
            </div>
            <ul className="space-y-0.5">
              {recent.slice(0, 8).map((r) => {
                // Backend sessions expire at SESSION_TTL_SECONDS = 1h.
                // Mark anything older than that visually so users don't expect a restore.
                const ageMs = Date.now() - r.ts;
                const isExpired = ageMs > 60 * 60 * 1000;
                const iconClass = isExpired
                  ? 'text-muted-foreground/50'
                  : r.status === 'completed' ? 'text-green-500' : 'text-amber-500';
                return (
                  <li key={r.sessionId}>
                    <button
                      onClick={() => openSession(r.sessionId)}
                      className={cn(
                        'group w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-left text-xs',
                        'hover:bg-muted',
                        sessionId === r.sessionId ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground',
                        isExpired && 'opacity-60',
                      )}
                      title={isExpired ? `${r.query} (likely expired on the server)` : r.query}
                    >
                      <span className="truncate flex items-center gap-1.5">
                        <ExternalLink className={cn('w-3 h-3 flex-shrink-0', iconClass)} />
                        <span className="truncate">{r.query}</span>
                        {isExpired && (
                          <span className="text-[10px] font-mono text-muted-foreground/60 flex-shrink-0">expired</span>
                        )}
                      </span>
                      <span
                        onClick={(e) => dropSession(r.sessionId, e)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-secondary"
                        role="button"
                        title="Remove from history"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
