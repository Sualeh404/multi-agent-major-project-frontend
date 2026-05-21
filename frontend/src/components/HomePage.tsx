import { motion } from 'framer-motion';
import {
  Library, Microscope, Shield, BookTemplate, Sparkles, ArrowRight,
  FileSearch, FileDown, MessageSquareQuote, Gauge, Upload, UserCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRoute } from '@/utils/route';

const AGENT_STEPS = [
  {
    icon: Library,
    name: 'Librarian',
    color: 'text-blue-500',
    desc: 'Searches arXiv (with Semantic Scholar fallback), fetches the top-N papers, and chunks their abstracts.',
  },
  {
    icon: Microscope,
    name: 'Analyst',
    color: 'text-purple-500',
    desc: 'Extracts algorithms, architectures, and equations — translating dense math into plain English.',
  },
  {
    icon: Shield,
    name: 'Critic',
    color: 'text-orange-500',
    desc: 'Three persona-LLMs (methodology, reproducibility, novelty) audit the extraction. If two reject, the graph loops.',
  },
  {
    icon: BookTemplate,
    name: 'Synthesizer',
    color: 'text-green-500',
    desc: 'Compiles the final markdown review with inline [n] citations, a comparison table, and a Connections subsection.',
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Adversarial validation',
    desc: 'Every claim is audited by three persona-LLMs before it lands in the review. Confidence labels surface when consensus is weak.',
  },
  {
    icon: MessageSquareQuote,
    title: 'Traceable citations',
    desc: 'Click any [n] chip to jump to the exact source chunk, with the cited claim highlighted in context.',
  },
  {
    icon: FileSearch,
    title: 'Comparison table',
    desc: 'Side-by-side methodology, limitations, key findings, and equations for every paper — sortable.',
  },
  {
    icon: UserCheck,
    title: 'Human-in-the-loop',
    desc: 'Optionally review the Librarian\'s candidate papers and prune them before the Analyst runs.',
  },
  {
    icon: Upload,
    title: 'BYOPDF',
    desc: 'Upload your own PDFs (up to 5, 15 MB each) to bypass arXiv entirely and run the pipeline on private work.',
  },
  {
    icon: FileDown,
    title: 'Academic exports',
    desc: 'Download as Markdown, JSON, BibTeX, RIS, LaTeX, CSV, or PDF. Citations pre-formatted in APA / MLA / IEEE / Chicago.',
  },
];

export function HomePage() {
  const [, navigate] = useRoute();
  const goToApp = () => navigate('/');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative px-6 py-20 sm:py-28 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Multi-agent · adversarially validated · citation-traceable
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Active literature synthesis<br />
            <span className="text-muted-foreground">for STEM research.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Type a research question. Four specialized agents read the recent literature, argue with each other,
            and compile a citation-mapped review in ~1–3 minutes. Every claim is traced back to its source chunk.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={goToApp} className="gap-2">
              Launch app
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/help')} className="gap-2">
              Read the docs
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Why it's not just ChatGPT */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="space-y-2 text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold">Why not just ask a chatbot?</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Chatbots improvise. We retrieve real papers, extract structured methodology, and validate adversarially before
            answering — with every line tied to a citation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6 space-y-2">
                <f.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Agent pipeline */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="space-y-2 text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold">How the pipeline works</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Each query runs through four agents in sequence, with a cyclic feedback loop between Critic and Librarian.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AGENT_STEPS.map((step, i) => (
            <Card key={step.name}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary">
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">step {i + 1}</p>
                    <h3 className="font-semibold text-foreground">{step.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Avg. latency', value: '~90 s', icon: Gauge },
            { label: 'Papers per run', value: '1–10', icon: Library },
            { label: 'Export formats', value: '7', icon: FileDown },
            { label: 'Cost per query', value: '< ₹10', icon: Sparkles },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 text-center space-y-1">
                <s.icon className="w-5 h-5 text-primary mx-auto" />
                <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-3xl mx-auto text-center">
        <Card>
          <CardContent className="py-12 space-y-4">
            <h2 className="text-2xl font-semibold">Ready to map a field in 3 minutes?</h2>
            <p className="text-sm text-muted-foreground">
              No sign-up. Start with an example or type your own research question.
            </p>
            <Button size="lg" onClick={goToApp} className="gap-2 mt-2">
              Launch app
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="px-6 py-10 max-w-5xl mx-auto border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          STEM Literature Synthesis · Built with FastAPI, LangGraph, and React
        </p>
      </footer>
    </div>
  );
}
