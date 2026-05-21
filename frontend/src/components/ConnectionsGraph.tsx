import { useMemo } from 'react';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Network } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface Edge {
  from: number; // 1-indexed paper number
  to: number;
  label: string;
}

const STOP = new Set([
  'the','a','an','and','or','of','to','in','for','on','with','is','was','are','were','be','been',
  'this','that','it','its','their','these','those','from','by','as','at','we','they','our','than',
  'such','also','only','about','while','using','more','most','some','any','one','two','three','very',
]);

function keywords(s: string): Set<string> {
  return new Set(
    (s || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = [];
  for (const w of a) if (b.has(w)) out.push(w);
  return out;
}

export function ConnectionsGraph() {
  const { result } = useSynthesisStore();
  const { setSelectedCitation } = useUIStore();
  const papers = result?.papers || [];
  const analyses = result?.analyses || [];

  // Build edges: for each pair of papers, if paper A's stated *limitations*
  // share ≥ 2 keywords with paper B's *future_work*, draw an edge A → B.
  // This mirrors what the synthesizer's "Connections" subsection narrates,
  // but as a visual graph instead of one prose paragraph.
  const edges: Edge[] = useMemo(() => {
    if (papers.length < 2 || analyses.length < 2) return [];
    const byId = new Map(analyses.map((a) => [a.paper_id, a]));
    const idxById = new Map(papers.map((p, i) => [p.paper_id, i + 1]));

    const out: Edge[] = [];
    for (const a of papers) {
      const aA = byId.get(a.paper_id);
      if (!aA?.limitations?.length) continue;
      for (const b of papers) {
        if (b.paper_id === a.paper_id) continue;
        const aB = byId.get(b.paper_id);
        if (!aB?.future_work?.length && !(aB?.algorithms?.length)) continue;

        const limKeys = keywords(aA.limitations.join(' '));
        const futKeys = keywords([...(aB?.future_work || []), ...(aB?.algorithms || []), aB?.architecture || ''].join(' '));
        const shared = overlap(limKeys, futKeys);
        if (shared.length >= 2) {
          out.push({
            from: idxById.get(a.paper_id)!,
            to: idxById.get(b.paper_id)!,
            label: shared.slice(0, 3).join(' / '),
          });
        }
      }
    }
    // Dedup A→B keeping highest-overlap edge (already first match wins by chance, fine for v1)
    return out;
  }, [papers, analyses]);

  if (papers.length < 2) return null;

  // Layout: arrange papers around a circle so the graph reads clearly.
  const W = 480, H = 320, R = 110, CX = W / 2, CY = H / 2;
  const positions = papers.map((p, i) => {
    const angle = (2 * Math.PI * i) / papers.length - Math.PI / 2;
    return { idx: i + 1, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), title: p.title || p.paper_id };
  });

  const noEdges = edges.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="w-5 h-5" />
          Connections between papers
        </CardTitle>
        <CardDescription>
          Each arrow points from a paper whose stated limitation overlaps with another paper's future-work or methods.
          Click a node to open that source.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {noEdges ? (
          <p className="text-sm text-muted-foreground">
            No cross-paper connections detected from the analyses. Read the "Connections" subsection of the
            synthesis essay for the narrative view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl mx-auto" role="img" aria-label="Connections between papers">
              <defs>
                <marker id="conn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="currentColor" className="text-muted-foreground" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = positions.find((p) => p.idx === e.from)!;
                const b = positions.find((p) => p.idx === e.to)!;
                // Curve the line slightly so reciprocal edges don't overlap.
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const offset = 18;
                const nx = -dy, ny = dx;
                const len = Math.sqrt(nx * nx + ny * ny) || 1;
                const cx = mx + (nx / len) * offset;
                const cy = my + (ny / len) * offset;
                return (
                  <g key={i}>
                    <path
                      d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                      fill="none"
                      strokeWidth={1.5}
                      className="stroke-muted-foreground/60"
                      markerEnd="url(#conn-arrow)"
                    />
                    <text x={cx} y={cy} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      {e.label}
                    </text>
                  </g>
                );
              })}
              {positions.map((p) => (
                <g key={p.idx} className="cursor-pointer" onClick={() => setSelectedCitation(String(p.idx))}>
                  <circle cx={p.x} cy={p.y} r={20} className="fill-secondary stroke-border" strokeWidth={1.5} />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-foreground text-sm font-semibold">
                    [{p.idx}]
                  </text>
                  <title>{p.title}</title>
                </g>
              ))}
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
