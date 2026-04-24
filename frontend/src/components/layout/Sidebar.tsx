import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Settings, Activity, Database, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

const navItems = [
  { id: 'result', icon: BookOpen, label: 'Synthesis' },
  { id: 'telemetry', icon: Activity, label: 'Telemetry' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'sources', icon: Database, label: 'Sources' },
  { id: 'help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { activeTab, setActiveTab } = useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'bg-card border-r border-border',
        'flex flex-col sticky top-0 h-screen'
      )}
    >
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
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
