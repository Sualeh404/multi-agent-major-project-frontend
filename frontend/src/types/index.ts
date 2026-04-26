export interface DocumentChunk {
  chunk_id: string;
  paper_id: string;
  text: string;
  section: 'Abstract' | 'Introduction' | 'Methodology' | 'Results' | 'Conclusion';
}

export interface EquationExplanation {
  latex: string;
  plain_english: string;
}

export interface ExtractedMethodology {
  paper_id: string;
  algorithms: string[];
  equations: EquationExplanation[];
  architecture: string;
}

export interface CriticAudit {
  flaw_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  chunk_id?: string;
}

export interface CostTracker {
  total_inr: number;
  llm_costs: {
    agent: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_inr: number;
  }[];
}

export interface TelemetryEvent {
  agent: string;
  status: string;
  timestamp: number;
  metrics?: {
    faithfulness?: number;
    answer_relevancy?: number;
  };
}

export type SynthesisStatus = 'idle' | 'processing' | 'completed' | 'failed';

export type DepthLevel = 'rapid' | 'comprehensive';

export type LLMProvider = 'cloud' | 'gemini';

export type Domain = 'any' | 'cs' | 'physics' | 'math' | 'bio';

export type Timeframe = '1y' | '3y' | '5y' | 'all';

export type FocusArea = 'methodology' | 'limitations' | 'math';

export interface SynthesisRequest {
  query: string;
  depth?: DepthLevel;
  max_papers?: number;
  provider?: LLMProvider;
  domain?: Domain;
  timeframe?: Timeframe;
  focus_areas?: FocusArea[];
}

export interface ComparisonRow {
  paper_id: string;
  methodology: string;
  limitations: string;
  key_finding: string;
  equations: string;
}

export interface SynthesisResponse {
  session_id: string;
  status: string;
}

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface SynthesisResult {
  session_id: string;
  status: SynthesisStatus;
  synthesis?: string;
  confidence?: ConfidenceLevel;
  outline?: string[];
  comparison_table?: ComparisonRow[];
  cost_inr?: number;
  chunks?: DocumentChunk[];
  analyses?: ExtractedMethodology[];
  audits?: CriticAudit[];
  telemetry?: TelemetryEvent[];
}

export interface AgentState {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  isActive: boolean;
  timestamp?: number;
  description?: string;
}

export interface UserSettings {
  depth: DepthLevel;
  max_papers: number;
  revision_limit: number;
  provider: LLMProvider;
  domain: Domain;
  timeframe: Timeframe;
  focus_areas: FocusArea[];
}

export const AGENT_ORDER = ['Librarian', 'Analyst', 'Critic', 'Synthesizer'] as const;
export type AgentName = typeof AGENT_ORDER[number];