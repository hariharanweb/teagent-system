import { create } from 'zustand';
import type { PageNarration } from '../lib/narration/pageNarration';

interface NarrationState {
  /** Page narrations keyed by pageId. */
  pages: Record<string, PageNarration>;
  /** Set while pages are being narrated, e.g. { current: 2, total: 5 }. */
  progress: { current: number; total: number } | null;
  message: string | null;
  addPages: (pages: PageNarration[]) => void;
  setProgress: (progress: NarrationState['progress']) => void;
  setMessage: (message: string | null) => void;
  reset: () => void;
}

// In memory only: a chapter's audio is megabytes, far past sessionStorage's limit. A refresh
// drops it; the durable copy is the downloaded Narration file, which can be reopened.
export const useNarrationStore = create<NarrationState>()((set) => ({
  pages: {},
  progress: null,
  message: null,
  addPages: (pages) =>
    set((state) => ({ pages: { ...state.pages, ...Object.fromEntries(pages.map((p) => [p.pageId, p])) } })),
  setProgress: (progress) => set({ progress }),
  setMessage: (message) => set({ message }),
  reset: () => set({ pages: {}, progress: null, message: null }),
}));
