import { create } from 'zustand';
import type { UserSettings, DocumentChunk } from '@/types';

const SETTINGS_KEY = 'stem-synth.settings.v1';
const API_KEY_STORAGE = 'stem-synth.apiKey.v1';

const DEFAULT_SETTINGS: UserSettings = {
  depth: 'comprehensive',
  max_papers: 5,
  revision_limit: 2,
  provider: 'cloud',
  domain: 'any',
  timeframe: 'all',
  focus_areas: [],
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: UserSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {/* ignore */}
}

export function loadStoredApiKey(): string {
  try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
}

export function saveStoredApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {/* ignore */}
}

interface UIState {
  sidebarOpen: boolean;
  selectedCitation: string | null;
  selectedChunk: DocumentChunk | null;
  activeTab: 'result' | 'settings' | 'telemetry' | 'sources' | 'help';
  settingsOpen: boolean;
  settings: UserSettings;
  darkMode: boolean;

  toggleSidebar: () => void;
  setSelectedCitation: (id: string | null) => void;
  setSelectedChunk: (chunk: DocumentChunk | null) => void;
  setActiveTab: (tab: UIState['activeTab']) => void;
  toggleSettings: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  toggleDarkMode: () => void;
}

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkMode(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('darkMode', String(dark));
}

const initialDark = getInitialDarkMode();
applyDarkMode(initialDark);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCitation: null,
  selectedChunk: null,
  activeTab: 'result',
  settingsOpen: false,
  settings: loadSettings(),
  darkMode: initialDark,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedCitation: (id: string | null) => set({ selectedCitation: id }),
  setSelectedChunk: (chunk: DocumentChunk | null) => set({ selectedChunk: chunk }),
  setActiveTab: (tab: UIState['activeTab']) => set({ activeTab: tab }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  updateSettings: (newSettings: Partial<UserSettings>) =>
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      saveSettings(merged);
      return { settings: merged };
    }),

  toggleDarkMode: () => set((state) => {
    const newDark = !state.darkMode;
    applyDarkMode(newDark);
    return { darkMode: newDark };
  }),
}));
