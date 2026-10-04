import { ChatOpenAI } from '@langchain/openai';
import OpenAI from 'openai';
import { getOpenAiApiKey } from '../auth/ssm.js';

// Vision-capable model is only needed for image extraction — the expensive call.
// gpt-6-sol: benchmarked on a Kannada page, gpt-4.1/gpt-4o downscale the photo too far and loop
// or invent text. It only transcribes; medium effort is what reliably keeps rare words intact.
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-6-sol';
// Reasoning models reject temperature 0; set to '' to use a non-reasoning model with temperature 0.
const VISION_REASONING_EFFORT = process.env.OPENAI_VISION_REASONING_EFFORT ?? 'medium';
// Translates the already-transcribed text; benchmarked to keep the original text intact in ~7s.
const TRANSLATION_MODEL = process.env.OPENAI_TRANSLATION_MODEL ?? 'gpt-4.1';
// Cheaper text model for glossary generation, chat scope-check, and chat answers.
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';

// Text-to-speech for Narration; LangChain has no TTS wrapper, so this uses the raw SDK.
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE ?? 'coral';

let cachedVisionModel: ChatOpenAI | undefined;
let cachedTextModel: ChatOpenAI | undefined;
let cachedTranslationModel: ChatOpenAI | undefined;
let cachedSdkClient: OpenAI | undefined;

export async function getVisionModel(): Promise<ChatOpenAI> {
  if (!cachedVisionModel) {
    const apiKey = await getOpenAiApiKey();
    cachedVisionModel = new ChatOpenAI(
      VISION_REASONING_EFFORT
        ? { apiKey, model: VISION_MODEL, reasoning: { effort: VISION_REASONING_EFFORT as 'medium' } }
        : { apiKey, model: VISION_MODEL, temperature: 0 },
    );
  }
  return cachedVisionModel;
}

export async function getTranslationModel(): Promise<ChatOpenAI> {
  if (!cachedTranslationModel) {
    const apiKey = await getOpenAiApiKey();
    cachedTranslationModel = new ChatOpenAI({ apiKey, model: TRANSLATION_MODEL, temperature: 0 });
  }
  return cachedTranslationModel;
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
