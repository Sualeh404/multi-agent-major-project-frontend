import { useSynthesisStore } from '@/stores/synthesisStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, BookOpen } from 'lucide-react';
import { getArxivUrl } from '@/utils/arxiv';

export function SourcesPanel() {
  const { result } = useSynthesisStore();
  const chunks = result?.chunks || [];

  if (chunks.length === 0) {
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

  // Group chunks by paper_id
  const sourcesByPaper = chunks.reduce((acc, chunk) => {
    const paperId = chunk.paper_id;
    if (!acc[paperId]) {
      acc[paperId] = [];
    }
    acc[paperId].push(chunk);
    return acc;
  }, {} as Record<string, typeof chunks>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrieved Sources</CardTitle>
        <CardDescription>
          {chunks.length} chunks from {Object.keys(sourcesByPaper).length} papers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(sourcesByPaper).map(([paperId, paperChunks]) => (
          <div key={paperId} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{paperId}</span>
              </div>
              <Badge variant="secondary">{paperChunks.length} chunks</Badge>
            </div>
            <div className="space-y-2">
              {paperChunks.slice(0, 3).map((chunk, idx) => (
                <div key={idx} className="text-sm text-muted-foreground pl-2 border-l-2">
                  <span className="text-xs text-primary mb-1 block">{chunk.section}</span>
                  {chunk.text.substring(0, 150)}...
                </div>
              ))}
              {paperChunks.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{paperChunks.length - 3} more chunks
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => window.open(getArxivUrl(paperId), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Paper
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
