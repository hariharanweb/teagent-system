import type { LanguageCode } from '@teagent/shared';
import { getOpenAiSdkClient, TTS_MODEL, TTS_VOICE } from './openaiClients.js';
import { buildNarrationInstructions } from './prompts/narration.prompt.js';

// A page's lines are synthesized in parallel to stay under the API Gateway 30s ceiling,
// but bounded so one page doesn't trip OpenAI's per-minute request limit.
const TTS_CONCURRENCY = 8;
const MAX_ATTEMPTS = 2;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  return status === undefined || status === 429 || status >= 500;
}

async function synthesizeOne(text: string, instructions: string): Promise<string> {
  const client = await getOpenAiSdkClient();
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await client.audio.speech.create({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: text,
        instructions,
        response_format: 'mp3',
      });
      return Buffer.from(await response.arrayBuffer()).toString('base64');
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) throw err;
    }
  }
}

/** Returns one base64 MP3 clip per line, in input order. One clip per line keeps line boundaries exact. */
export async function synthesizeLines(lines: string[], language: LanguageCode): Promise<string[]> {
  const instructions = buildNarrationInstructions(language);
  const clips = new Array<string>(lines.length);
  let next = 0;

  async function worker() {
    while (next < lines.length) {
      const index = next++;
      clips[index] = await synthesizeOne(lines[index]!, instructions);
    }
  }

  await Promise.all(Array.from({ length: Math.min(TTS_CONCURRENCY, lines.length) }, worker));
  return clips;
}
