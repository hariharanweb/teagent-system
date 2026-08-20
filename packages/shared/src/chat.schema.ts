import { z } from 'zod';
import { LANGUAGE_CODES } from './languages.js';
import { anyTranslationLineSchema } from './translationLine.schema.js';
import { glossaryEntrySchema } from './glossary.schema.js';

export const chatRoleSchema = z.enum(['user', 'assistant']);

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1).max(1000),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const CHAT_MESSAGE_MAX_LENGTH = 500;
export const CHAT_HISTORY_MAX_MESSAGES = 12;

export const chatAskRequestSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  chapterTitle: z.string().min(1),
  translation: z.array(anyTranslationLineSchema),
  glossary: z.array(glossaryEntrySchema),
  history: z.array(chatMessageSchema).max(CHAT_HISTORY_MAX_MESSAGES).default([]),
  message: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});
export type ChatAskRequest = z.infer<typeof chatAskRequestSchema>;

export const chatScopeSchema = z.enum(['on_topic', 'off_topic', 'override_attempt']);
export type ChatScope = z.infer<typeof chatScopeSchema>;

export const chatAskResponseSchema = z.object({
  reply: z.string(),
  scope: chatScopeSchema,
});
export type ChatAskResponse = z.infer<typeof chatAskResponseSchema>;
