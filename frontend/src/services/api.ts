import type { SynthesisRequest, SynthesisResponse, SynthesisResult } from '@/types';
import { loadStoredApiKey } from '@/stores/uiStore';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const ENV_API_KEY = import.meta.env.VITE_API_KEY || '';

function activeApiKey(): string {
  // Stored in localStorage takes precedence so the user can override at runtime.
  return loadStoredApiKey() || ENV_API_KEY;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = activeApiKey();
  if (key) h['x-api-key'] = key;
  return h;
}

export function buildWsUrl(path: string): string {
  const wsBase = API_BASE.replace(/^http/, 'ws');
  const key = activeApiKey();
  const qs = key ? `?api_key=${encodeURIComponent(key)}` : '';
  return `${wsBase}${path}${qs}`;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(401, 'Unauthorized — check your API key');
    }
    const error = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, error);
  }
  return response.json();
}

export async function startSynthesis(request: SynthesisRequest): Promise<SynthesisResponse> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/start`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      query: request.query,
      depth: request.depth || 'comprehensive',
      max_papers: request.max_papers || 5,
      provider: request.provider || 'cloud',
      domain: request.domain || 'any',
      timeframe: request.timeframe || 'all',
      focus_areas: request.focus_areas || [],
    }),
  });
  return handleResponse<SynthesisResponse>(response);
}

export async function getSynthesisResult(sessionId: string): Promise<SynthesisResult> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}/result`, {
    headers: headers(),
  });
  return handleResponse<SynthesisResult>(response);
}

export async function cancelSynthesis(sessionId: string): Promise<{ session_id: string; status: string; cancelled: boolean }> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse(response);
}

import type { PaperCitation } from '@/types';

export async function getCitations(sessionId: string): Promise<{ session_id: string; citations: PaperCitation[] }> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}/citations`, {
    headers: headers(),
  });
  return handleResponse(response);
}

export function buildExportUrl(sessionId: string, format: 'markdown' | 'json' | 'bibtex' | 'ris' | 'latex' | 'csv' | 'pdf'): string {
  return `${API_BASE}/api/v1/synthesis/${sessionId}/export/${format}`;
}

import type { Paper, UploadResponse } from '@/types';

export async function uploadPapers(files: File[]): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  // Don't set Content-Type — browser sets multipart boundary automatically
  const reqHeaders: Record<string, string> = {};
  const key = activeApiKey();
  if (key) reqHeaders['x-api-key'] = key;
  const response = await fetch(`${API_BASE}/api/v1/upload`, {
    method: 'POST',
    headers: reqHeaders,
    body: form,
  });
  return handleResponse<UploadResponse>(response);
}

export async function getCandidatePapers(sessionId: string): Promise<{ session_id: string; status: string; papers: Paper[] }> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}/papers`, {
    headers: headers(),
  });
  return handleResponse(response);
}

export async function approvePapers(sessionId: string, paperIds: string[]): Promise<{ session_id: string; status: string; approved_count: number }> {
  const response = await fetch(`${API_BASE}/api/v1/synthesis/${sessionId}/approve`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ approved_paper_ids: paperIds }),
  });
  return handleResponse(response);
}
