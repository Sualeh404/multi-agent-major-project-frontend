import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { getCandidatePapers } from '@/services/api';
import { getArxivUrl } from '@/utils/arxiv';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/utils/cn';
import type { Paper } from '@/types';

export function PaperApproval() {
  const { sessionId, approveSelectedPapers } = useSynthesisStore();
  const addToast = useToastStore((s) => s.addToast);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    getCandidatePapers(sessionId)
      .then((res) => {
        if (cancelled) return;
        setPapers(res.papers);
        setSelected(new Set(res.papers.map((p) => p.paper_id)));
      })
      .catch((e) => addToast(e instanceof Error ? e.message : 'Failed to load papers', 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [sessionId, addToast]);

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = useMemo(() => papers.length > 0 && selected.size === papers.length, [papers, selected]);
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(papers.map((p) => p.paper_id)));
  };

  const handleApprove = async () => {
    if (selected.size === 0) {
      addToast('Select at least one paper to continue', 'info');
      return;
    }
    setSubmitting(true);
    await approveSelectedPapers([...selected]);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading candidate papers...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Approve papers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select which papers to feed into Analyst → Critic → Synthesizer. Deselecting saves cost on irrelevant papers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={submitting || selected.size === 0}
              className="gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Continue ({selected.size})
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {papers.map((p) => {
            const checked = selected.has(p.paper_id);
            return (
              <button
                key={p.paper_id}
                onClick={() => toggle(p.paper_id)}
                className={cn(
                  'w-full flex items-start gap-3 py-3 text-left hover:bg-secondary/40 px-1 -mx-1 rounded transition-colors',
                )}
              >
                <span
                  className={cn(
                    'mt-1 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/40',
                  )}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {p.title || p.paper_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.authors.length > 0 ? p.authors.slice(0, 4).join(', ') : 'Unknown authors'}
                    {p.year ? ` · ${p.year}` : ''}
                    {p.source ? ` · ${p.source}` : ''}
                  </p>
                  {p.abstract && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {p.abstract}
                    </p>
                  )}
                </div>
                {p.source === 'arxiv' && (
                  <a
                    href={getArxivUrl(p.paper_id)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                    title="View on arXiv"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
