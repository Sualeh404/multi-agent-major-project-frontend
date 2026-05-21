import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Library, Microscope, Shield, BookTemplate, Zap, Gauge, HelpCircle,
  UserCheck, Upload, FileDown, MessageSquareQuote, Clock, IndianRupee,
} from 'lucide-react';

const agentSteps = [
  { icon: Library,      name: 'Librarian',    desc: 'Searches arXiv (Semantic Scholar fallback) and chunks paper abstracts.' },
  { icon: Microscope,   name: 'Analyst',      desc: 'Extracts algorithms, equations, architecture, and stated limitations.' },
  { icon: Shield,       name: 'Critic',       desc: 'Three persona-LLMs audit for methodology, reproducibility, novelty.' },
  { icon: BookTemplate, name: 'Synthesizer',  desc: 'Compiles the Markdown review with [n] citations and a comparison table.' },
];

const features = [
  { icon: UserCheck,        title: 'Approve papers',      desc: 'Toggle "Approve papers" in the search bar to review candidate papers before the Analyst runs.' },
  { icon: Upload,           title: 'BYOPDF',              desc: 'Drag PDFs onto the upload zone (max 5, 15 MB each) to bypass arXiv search.' },
  { icon: FileDown,         title: '7 export formats',    desc: 'Markdown · JSON · BibTeX · RIS · LaTeX · CSV · PDF — citation strings pre-formatted in APA / MLA / IEEE / Chicago.' },
  { icon: MessageSquareQuote, title: 'Click citations',   desc: 'Every [n] chip opens a side panel with the source paper, abstract chunks, and the cited claim highlighted.' },
  { icon: Clock,            title: 'Live ETA',            desc: 'The agent strip shows elapsed time, an ETA learned from your past runs, and the running INR cost.' },
  { icon: IndianRupee,      title: 'Cost transparency',   desc: 'INR per call, aggregated per session. Typical run: ₹0.50–₹1.50 on Groq.' },
];

const shortcuts = [
  { keys: '/',           desc: 'Focus the search input' },
  { keys: '⌘ / Ctrl + Enter', desc: 'Submit query while typing' },
  { keys: '?',           desc: 'Open this help panel' },
  { keys: '⌘ / Ctrl + K',     desc: 'Reset and start a new query' },
  { keys: 'Esc',         desc: 'Close the open citation panel' },
];

export function HelpPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            How this works
          </CardTitle>
          <CardDescription>
            Four specialized agents read recent literature, audit each other adversarially,
            and produce a citation-mapped review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Quickstart</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
              <li>Type a focused research question into the search bar.</li>
              <li>Pick a domain (CS, Physics, Math, Bio) and depth if relevant.</li>
              <li>Click <strong className="text-foreground">Analyze</strong>. A typical run takes 60–120 s.</li>
              <li>Read the synthesis with inline [n] citations; open Sources for full chunks.</li>
              <li>Export via Markdown / BibTeX / LaTeX / PDF when you're done.</li>
            </ol>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">The agent pipeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agentSteps.map((step) => (
                <div key={step.name} className="flex gap-3 p-3 rounded-lg border border-border">
                  <step.icon className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{step.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The Critic loops back to the Librarian (max 2 revisions) when ≥ 2 personas reject.
              A "Low Confidence" badge surfaces when the circuit breaker trips.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Modes</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Rapid</span>
                </div>
                <p className="text-xs text-muted-foreground">Fewer papers (2), faster turnaround. Good for scoping.</p>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Comprehensive</span>
                </div>
                <p className="text-xs text-muted-foreground">5 papers, more thorough audits. Default.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You can also set the paper count (1–10) explicitly in Advanced search options.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features worth knowing</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3 p-3 rounded-lg border border-border">
              <f.icon className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keyboard shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {shortcuts.map((s) => (
              <li key={s.keys} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{s.desc}</span>
                <Badge variant="secondary" className="font-mono">{s.keys}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limits to know</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Sources expire after 1 hour</strong> — the URL link to a session is shareable
            but stops working once the backend session expires. Export to BibTeX/Markdown to keep results.
          </p>
          <p>
            <strong className="text-foreground">Abstract-level retrieval</strong> — by default the Librarian only reads abstracts.
            The Analyst extracts what it can from those. For deeper extraction the system will fetch the full PDF when available.
          </p>
          <p>
            <strong className="text-foreground">arXiv rate limits</strong> — sometimes arXiv throttles us with 429. The pipeline
            falls back to Semantic Scholar; if both are rate-limited, you'll see a "no sources retrieved" message — retry in a few minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
