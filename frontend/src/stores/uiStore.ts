import { create } from 'zustand';
import type { DepthLevel, UserSettings, DocumentChunk } from '@/types';

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

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedCitation: null,
  selectedChunk: null,
  activeTab: 'result',
  settingsOpen: false,
  settings: {
    depth: 'comprehensive',
    max_papers: 5,
    revision_limit: 2,
  },
  darkMode: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSelectedCitation: (id: string | null) => set({ selectedCitation: id }),
  
  setSelectedChunk: (chunk: DocumentChunk | null) => set({ selectedChunk: chunk }),
  
  setActiveTab: (tab: UIState['activeTab']) => set({ activeTab: tab }),
  
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  
  updateSettings: (newSettings: Partial<UserSettings>) => 
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));