import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'era-60-70' | 'era-80-90';

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'era-60-70', label: 'golden vinyl', description: 'Light · kraft paper, burgundy ink' },
  { id: 'era-80-90', label: 'walkman black', description: 'Dark · black, bordeaux, smoky aura' },
];

function defaultTheme(): ThemeId {
  const prefersLight =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'era-60-70' : 'era-80-90';
}

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: defaultTheme(),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'mood-music-theme' },
  ),
);
