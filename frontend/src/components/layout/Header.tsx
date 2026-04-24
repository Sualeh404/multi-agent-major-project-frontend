import { Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Input } from '@/components/ui/input';

export function Header() {
  const { query, setQuery, startSynthesis, isLoading, status } = useSynthesisStore();
  const { settings, updateSettings, darkMode, toggleDarkMode } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && status !== 'processing') {
      await startSynthesis(settings.depth, settings.max_papers);
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground flex-shrink-0">
            STEM Synthesis
          </h1>
          
          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your research query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 pr-4"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
