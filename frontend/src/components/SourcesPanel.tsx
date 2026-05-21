import { useSynthesisStore } from '@/stores/synthesisStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, BookOpen } from 'lucide-react';
import { getArxivUrl } from '@/utils/arxiv';

export function SourcesPanel() {
  const { result } = useSynthesisStore();
  const chunks = result?.chunks || [];
  const papers = result?.papers || [];

  // Look up a paper by id so we can show human-readable metadata
  // (title/year/authors) rather than the raw arXiv identifier.
  const paperById = new Map(papers.map((p) => [p.paper_id, p]));

  // Show even when chunks=0 but we have paper records (e.g. retrieval
  // succeeded but abstracts were empty — useful debug signal).
  if (chunks.length === 0 && papers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retrieved Sources</CardTitle>
          <CardDescription>
            Sources will appear here after you run a search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No sources retrieved yet. Enter a query and click Analyze to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group chunks by paper_id; use Map to preserve insertion order
  const sourcesByPaper = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const arr = sourcesByPaper.get(chunk.paper_id) || [];
    arr.push(chunk);
    sourcesByPaper.set(chunk.paper_id, arr);
  }
  // Include papers that have no chunks so users still see their titles
  for (const p of papers) {
    if (!sourcesByPaper.has(p.paper_id)) sourcesByPaper.set(p.paper_id, []);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrieved Sources</CardTitle>
        <CardDescription>
          {chunks.length} chunks from {sourcesByPaper.size} {sourcesByPaper.size === 1 ? 'paper' : 'papers'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(sourcesByPaper.entries()).map(([paperId, paperChunks], idx) => {
          const paper = paperById.get(paperId);
          const title = paper?.title?.trim() || paperId;
          const authors = paper?.authors?.length ? paper.authors.join(', ') : null;
          const meta = [authors, paper?.year].filter(Boolean).join(' · ');
          const sourceLabel = paper?.source === 'user_upload' ? 'Uploaded' : paper?.source || 'arxiv';

          return (
            <div key={paperId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                      [{idx + 1}]
                    </span>
                    <h4 className="font-medium text-sm text-foreground leading-snug break-words">{title}</h4>
                  </div>
                  {meta && <p className="text-xs text-muted-foreground pl-7">{meta}</p>}
                  <div className="flex items-center gap-2 pl-7">
                    <Badge variant="outline" className="font-mono text-xs">{paperId}</Badge>
                    <Badge variant="secondary" className="text-xs">{sourceLabel}</Badge>
                  </div>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {paperChunks.length} {paperChunks.length === 1 ? 'chunk' : 'chunks'}
                </Badge>
              </div>

              {paperChunks.length > 0 ? (
                <div className="space-y-2">
                  {paperChunks.slice(0, 3).map((chunk, cIdx) => (
                    <div key={cIdx} className="text-sm text-muted-foreground pl-2 border-l-2">
                      <span className="text-xs text-primary mb-1 block">{chunk.section}</span>
                      {chunk.text.substring(0, 200)}{chunk.text.length > 200 ? '…' : ''}
                    </div>
                  ))}
                  {paperChunks.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      +{paperChunks.length - 3} more chunks
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-2 border-l-2 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  No text extracted — abstract was empty.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = paper?.pdf_url || getArxivUrl(paperId);
                    window.open(url, '_blank');
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View paper</span>
                </Button>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Abstract-level retrieval
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
