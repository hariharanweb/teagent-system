import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChapterFile, ChatMessage } from '@teagent/shared';

interface ChapterState {
  chapter: ChapterFile | null;
  chatHistory: ChatMessage[];
  setChapter: (chapter: ChapterFile) => void;
  clearChapter: () => void;
  appendChatMessage: (message: ChatMessage) => void;
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
    }),
    {
      name: 'teagent-chapter',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
