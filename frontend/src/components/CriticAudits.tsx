import { useMemo, useState } from 'react';
import { Shield, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { CriticAudit } from '@/types';

const PERSONA_LABELS: Record<string, string> = {
  methodology: 'Methodology',
  reproducibility: 'Reproducibility',
  novelty: 'Novelty',
};

const PERSONA_COLORS: Record<string, string> = {
  methodology: 'text-orange-500',
  reproducibility: 'text-cyan-500',
  novelty: 'text-purple-500',
};

interface Flag {
  persona: string;
  text: string;
  kind: 'bias' | 'flaw';
}

function parseFlag(s: string): Flag {
  const m = s.match(/^\[(\w+)\]\s*(.*)$/);
  if (m) return { persona: m[1], text: m[2], kind: 'flaw' };
  return { persona: 'unknown', text: s, kind: 'flaw' };
}

export function CriticAudits({ audits }: { audits: CriticAudit[] }) {
  const [expanded, setExpanded] = useState(false);

  // Group audits by paper, then by persona for display
  const grouped = useMemo(() => {
    const byPaper = new Map<string, { audits: CriticAudit[]; flags: Flag[] }>();
    for (const a of audits) {
      const bucket = byPaper.get(a.paper_id) || { audits: [], flags: [] };
      bucket.audits.push(a);
      for (const b of a.identified_biases || []) {
        const f = parseFlag(b);
        bucket.flags.push({ ...f, kind: 'bias' });
      }
      for (const f of a.methodology_flaws || []) {
        bucket.flags.push(parseFlag(f));
      }
      byPaper.set(a.paper_id, bucket);
    }
    return byPaper;
  }, [audits]);

  if (audits.length === 0) return null;

  const totalRejects = audits.filter((a) => a.verdict === 'reject').length;

  return (
    <Card>
      <CardContent className="pt-6">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Critic audits</h3>
            <span className="text-xs text-muted-foreground">
              {audits.length} review{audits.length === 1 ? '' : 's'} ·
              {' '}{totalRejects > 0
                ? <span className="text-red-500">{totalRejects} reject</span>
                : <span className="text-green-500">all pass</span>}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {Array.from(grouped.entries()).map(([paperId, { audits: paperAudits, flags }]) => {
              const flagsByPersona = new Map<string, Flag[]>();
              for (const f of flags) {
                const arr = flagsByPersona.get(f.persona) || [];
                arr.push(f);
                flagsByPersona.set(f.persona, arr);
              }
              const allPass = paperAudits.every((a) => a.verdict !== 'reject');
              return (
                <div key={paperId} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{paperId}</Badge>
                    {allPass ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle className="w-3.5 h-3.5" /> pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500">
                        <XCircle className="w-3.5 h-3.5" /> reject
                      </span>
                    )}
                  </div>
                  {flagsByPersona.size === 0 ? (
                    <p className="text-xs text-muted-foreground">No flags raised.</p>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(flagsByPersona.entries()).map(([persona, items]) => (
                        <div key={persona}>
                          <p className={cn(
                            'text-xs font-semibold uppercase tracking-wide',
                            PERSONA_COLORS[persona] ?? 'text-foreground',
                          )}>
                            {PERSONA_LABELS[persona] ?? persona}
                          </p>
                          <ul className="mt-1 space-y-0.5 pl-3 text-xs text-muted-foreground list-disc">
                            {items.map((f, i) => (
                              <li key={i}>{f.text}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
