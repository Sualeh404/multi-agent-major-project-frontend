import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, FileJson, FileText } from 'lucide-react';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { useToastStore } from '@/stores/toastStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function SynthesisResult() {
  const { result, status, query, sessionId, error } = useSynthesisStore();
  const { selectedCitation, setSelectedCitation } = useUIStore();
  const addToast = useToastStore((s) => s.addToast);

  const renderedContent = useMemo(() => {
    if (!result?.synthesis) return null;

    const parts = result.synthesis.split(/\[(\d+)\]/g);

    return parts.map((part, index) => {
      const num = parseInt(part);
      if (!isNaN(num)) {
        return (
          <button
            key={`citation-${index}`}
            onClick={() => setSelectedCitation(String(num))}
            className={cn(
              'font-mono text-sm px-1.5 py-0.5 rounded',
              'bg-secondary text-primary hover:bg-primary hover:text-primary-foreground',
              'transition-colors duration-200',
              selectedCitation === String(num) && 'bg-primary text-primary-foreground'
            )}
          >
            [{num}]
          </button>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [result?.synthesis, selectedCitation, setSelectedCitation]);

  const handleExport = (format: 'markdown' | 'json') => {
    if (!sessionId) return;
    const url = `${API_BASE}/api/v1/synthesis/${sessionId}/export/${format}`;
    window.open(url, '_blank');
    addToast(`Downloading ${format.toUpperCase()} export`, 'success');
  };

  if (status === 'idle' || !query) {
    return (
      <Card className="text-center">
        <CardContent className="py-16 space-y-3">
          <p className="text-lg text-muted-foreground">Enter a research query above</p>
          <p className="text-sm text-muted-foreground">
            e.g., "What are the latest advances in quantum computing?"
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'processing' || status === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-foreground">Synthesis</h2>
              <div className="flex items-center gap-2">
                {result?.cost_inr != null && (
                  <Badge variant="secondary">₹{result.cost_inr.toFixed(2)}</Badge>
                )}
                {status === 'completed' && result?.synthesis && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('markdown')}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Markdown</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('json')}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <FileJson className="w-4 h-4" />
                      <span className="hidden sm:inline">JSON</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {result?.synthesis ? (
              <div className="mt-4 text-sm leading-relaxed text-foreground">
                {renderedContent}
              </div>
            ) : (
              <div className="mt-6 space-y-2.5">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <Card className="text-center">
        <CardContent className="py-16 space-y-2">
          <p className="text-destructive text-lg">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
