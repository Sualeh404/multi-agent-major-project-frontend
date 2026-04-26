import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { useToastStore } from '@/stores/toastStore';
import { runDeepAudit } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ComparisonTable } from '@/components/ComparisonTable';
import { ExportMenu } from '@/components/ExportMenu';
import type { ConfidenceLevel } from '@/types';

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string; tooltip: string }> = {
  high: {
    label: 'High Confidence',
    color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
    tooltip: 'All papers passed the Critic\'s audit; methodologies align.',
  },
  moderate: {
    label: 'Moderate Confidence',
    color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    tooltip: 'Some papers raised concerns or required revision; review carefully.',
  },
  low: {
    label: 'Low Confidence',
    color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    tooltip: 'Circuit breaker tripped — little consensus found in the literature.',
  },
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIDENCE_CONFIG[level];
  return (
    <span
      title={cfg.tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        cfg.color,
      )}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function SynthesisResult() {
  const { result, status, query, sessionId, error } = useSynthesisStore();
  const { selectedCitation, setSelectedCitation } = useUIStore();
  const addToast = useToastStore((s) => s.addToast);
  const [auditing, setAuditing] = useState(false);

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

  const handleDeepAudit = async () => {
    if (!sessionId) return;
    setAuditing(true);
    try {
      const res = await runDeepAudit(sessionId);
      const f = res.metrics?.faithfulness;
      const r = res.metrics?.answer_relevancy;
      if (f != null || r != null) {
        addToast(
          `Audit: faithfulness ${(f ?? 0).toFixed(2)}, relevancy ${(r ?? 0).toFixed(2)}`,
          'success',
        );
      } else {
        addToast('Deep audit complete (RAGAS unavailable in environment)', 'info');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Audit failed', 'error');
    } finally {
      setAuditing(false);
    }
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {status === 'completed' && result?.comparison_table && result.comparison_table.length > 0 && (
          <ComparisonTable rows={result.comparison_table} />
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Synthesis</h2>
                {status === 'completed' && result?.confidence && (
                  <ConfidenceBadge level={result.confidence} />
                )}
              </div>
              <div className="flex items-center gap-2">
                {result?.cost_inr != null && (
                  <Badge variant="secondary">₹{result.cost_inr.toFixed(2)}</Badge>
                )}
                {status === 'completed' && result?.synthesis && sessionId && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeepAudit}
                      disabled={auditing}
                      className="gap-1.5 text-muted-foreground"
                      title="Run RAGAS faithfulness/relevancy evaluation (extra cost)"
                    >
                      {auditing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Deep Audit</span>
                    </Button>
                    <ExportMenu sessionId={sessionId} />
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
