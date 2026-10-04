import { Annotation } from '@langchain/langgraph';
import type { ChatMessage, GlossaryEntry, LanguageCode, AnyTranslationLine, PageTranscript } from '@teagent/shared';

export const ExtractState = Annotation.Root({
  imageS3Key: Annotation<string>,
  language: Annotation<LanguageCode>,
  imageUrl: Annotation<string>,
  transcript: Annotation<PageTranscript>({ reducer: (_, b) => b, default: () => [] }),
  extractionAttempts: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  warnings: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});
export type ExtractStateType = typeof ExtractState.State;

export const TranslateState = Annotation.Root({
  language: Annotation<LanguageCode>,
  transcript: Annotation<PageTranscript>,
  translationLines: Annotation<AnyTranslationLine[]>({ reducer: (_, b) => b, default: () => [] }),
  glossary: Annotation<GlossaryEntry[]>({ reducer: (_, b) => b, default: () => [] }),
  translationAttempts: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  /** Why the last attempt was rejected — fed back to the model as a repair prompt. */
  lastProblem: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  warnings: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});
export type TranslateStateType = typeof TranslateState.State;

export const ChatState = Annotation.Root({
  userMessage: Annotation<string>,
  language: Annotation<LanguageCode>,
  chapterTitle: Annotation<string>,
  translation: Annotation<AnyTranslationLine[]>,
  glossary: Annotation<GlossaryEntry[]>,
  history: Annotation<ChatMessage[]>,
  scope: Annotation<'on_topic' | 'off_topic' | 'override_attempt'>({
    reducer: (_, b) => b,
    default: () => 'on_topic',
  }),
  reply: Annotation<string>({ reducer: (_, b) => b, default: () => '' }),
});
export type ChatStateType = typeof ChatState.State;
