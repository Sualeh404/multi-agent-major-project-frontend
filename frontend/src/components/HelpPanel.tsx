import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Library, Microscope, Shield, BookTemplate, Zap, Gauge, HelpCircle } from 'lucide-react';

const agentSteps = [
  { icon: Library, name: 'Librarian', description: 'Retrieves relevant academic papers from arXiv and Semantic Scholar' },
  { icon: Microscope, name: 'Analyst', description: 'Extracts methodologies, equations, and algorithms from source papers' },
  { icon: Shield, name: 'Critic', description: 'Audits for dataset biases, methodology gaps, and math consistency' },
  { icon: BookTemplate, name: 'Synthesizer', description: 'Compiles final review with inline citations and confidence warnings' },
];

export function HelpPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Help & Documentation
        </CardTitle>
        <CardDescription>
          Learn how to use the STEM Literature Synthesis system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Enter your research query in the search bar above</li>
            <li>Select depth: <strong>Rapid</strong> (2 papers, quick) or <strong>Comprehensive</strong> (5 papers, detailed)</li>
            <li>Click <strong>Analyze</strong> to start the synthesis</li>
            <li>View results in the Synthesis tab or explore Sources, Telemetry, and Settings</li>
          </ol>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-3">Agent Pipeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentSteps.map((step) => (
              <div key={step.name} className="flex gap-3 p-3 rounded-lg border">
                <step.icon className="w-5 h-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-sm">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" />
                <span className="font-medium text-sm">Rapid</span>
              </div>
              <p className="text-xs text-muted-foreground">2 papers, faster analysis</p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4" />
                <span className="font-medium text-sm">Deep</span>
              </div>
              <p className="text-xs text-muted-foreground">5 papers, comprehensive analysis</p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-3">Citations</h3>
          <p className="text-muted-foreground">
            Click on citation badges <Badge>[n]</Badge> in the synthesis to jump to the source document.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
