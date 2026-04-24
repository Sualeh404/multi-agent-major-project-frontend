import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';

export function Header() {
  const { darkMode, toggleDarkMode } = useUIStore();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          STEM Synthesis
        </h1>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
