import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MAX_PAGES_PER_CHAPTER, type ChapterFile, type ChapterPage, type ChatMessage } from '@teagent/shared';

interface ChapterState {
  chapter: ChapterFile | null;
  chatHistory: ChatMessage[];
  setChapter: (chapter: ChapterFile) => void;
  clearChapter: () => void;
  appendChatMessage: (message: ChatMessage) => void;
  /** Adds more pages to the currently loaded chapter (chat history is kept, unlike setChapter). */
  appendPages: (pages: ChapterPage[]) => void;
  setLessonPlan: (lessonPlan: string) => void;
}

// In-memory + sessionStorage mirror only, so a refresh mid-session doesn't lose an unsaved
// chapter. This is NOT the durable persistence path — that's the download/reload-file flow
// (see lib/fileIO.ts). Nothing here is ever sent anywhere except in the /chat/ask request body.
export const useChapterStore = create<ChapterState>()(
  persist(
    (set) => ({
      chapter: null,
      chatHistory: [],
      setChapter: (chapter) => set({ chapter, chatHistory: [] }),
      clearChapter: () => set({ chapter: null, chatHistory: [] }),
      appendChatMessage: (message) =>
        set((state) => ({ chatHistory: [...state.chatHistory, message] })),
      appendPages: (pages) =>
        set((state) => {
          if (!state.chapter) return state;
          const merged = [...state.chapter.pages, ...pages].slice(0, MAX_PAGES_PER_CHAPTER);
          // Clear any cached lesson plan — it summarized the old, now-incomplete page set.
          return { chapter: { ...state.chapter, pages: merged, lessonPlan: undefined } };
        }),
      setLessonPlan: (lessonPlan) =>
        set((state) => (state.chapter ? { chapter: { ...state.chapter, lessonPlan } } : state)),
    }),
    {
      name: 'teagent-chapter',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
