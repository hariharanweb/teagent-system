import { ChatOpenAI } from '@langchain/openai';
import OpenAI from 'openai';
import { getOpenAiApiKey } from '../auth/ssm.js';

// Vision-capable model is only needed for image extraction — the expensive call.
// gpt-4.1: better OCR/instruction-following than gpt-4o on Indic pages, and cheaper per token.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1';
// Cheaper text model for glossary generation, chat scope-check, and chat answers.
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';

// Text-to-speech for Narration; LangChain has no TTS wrapper, so this uses the raw SDK.
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? 'coral';

let cachedVisionModel: ChatOpenAI | undefined;
let cachedTextModel: ChatOpenAI | undefined;
let cachedSdkClient: OpenAI | undefined;

export async function getVisionModel(): Promise<ChatOpenAI> {
  if (!cachedVisionModel) {
    const apiKey = await getOpenAiApiKey();
    cachedVisionModel = new ChatOpenAI({ apiKey, model: VISION_MODEL, temperature: 0 });
  }
  return cachedVisionModel;
}

export async function getTextModel(): Promise<ChatOpenAI> {
  if (!cachedTextModel) {
    const apiKey = await getOpenAiApiKey();
    cachedTextModel = new ChatOpenAI({ apiKey, model: TEXT_MODEL, temperature: 0.3 });
  }
  return cachedTextModel;
}

export async function getOpenAiSdkClient(): Promise<OpenAI> {
  if (!cachedSdkClient) {
    cachedSdkClient = new OpenAI({ apiKey: await getOpenAiApiKey() });
  }
  return cachedSdkClient;
}
