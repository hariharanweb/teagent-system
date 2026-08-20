import { ChatOpenAI } from '@langchain/openai';
import { getOpenAiApiKey } from '../auth/ssm.js';

// Vision-capable model is only needed for image extraction — the expensive call.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o';
// Cheaper text model for glossary generation, chat scope-check, and chat answers.
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';

let cachedVisionModel: ChatOpenAI | undefined;
let cachedTextModel: ChatOpenAI | undefined;

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
