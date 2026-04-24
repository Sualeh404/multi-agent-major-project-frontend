import type { SynthesisRequest, SynthesisResponse, SynthesisResult } from '@/types';

const API_BASE = 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, error);
  }
  return response.json();
}

export async function startSynthesis(request: SynthesisRequest): Promise<SynthesisResponse> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: request.query,
      depth: request.depth || 'comprehensive',
      max_papers: request.max_papers || 5,
    }),
  });
  return handleResponse<SynthesisResponse>(response);
}

export async function getSynthesisResult(sessionId: string): Promise<SynthesisResult> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}/result`);
  return handleResponse<SynthesisResult>(response);
}

export async function pollSynthesisResult(
  sessionId: string,
  onProgress?: (result: SynthesisResult) => void,
  intervalMs = 2000,
  maxAttempts = 30
): Promise<SynthesisResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getSynthesisResult(sessionId);
    
    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }
    
    onProgress?.(result);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Polling timeout - synthesis took too long');
}