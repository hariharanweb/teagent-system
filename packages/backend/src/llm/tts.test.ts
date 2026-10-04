import { beforeEach, describe, expect, it, vi } from 'vitest';

const speechCreateMock = vi.fn();

vi.mock('./openaiClients.js', () => ({
  TTS_MODEL: 'gpt-4o-mini-tts',
  TTS_VOICE: 'coral',
  getOpenAiSdkClient: async () => ({ audio: { speech: { create: speechCreateMock } } }),
}));

const { synthesizeLines } = await import('./tts.js');

function audioResponse(text: string) {
  return { arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

const b64 = (text: string) => Buffer.from(text).toString('base64');

describe('synthesizeLines', () => {
  beforeEach(() => {
    speechCreateMock.mockReset();
  });

  it('returns one clip per line in input order, even when calls finish out of order', async () => {
    speechCreateMock.mockImplementation(async ({ input }: { input: string }) => {
      await new Promise((r) => setTimeout(r, input === 'first' ? 20 : 1));
      return audioResponse(`mp3:${input}`);
    });

    const clips = await synthesizeLines(['first', 'second', 'third'], 'hin');

    expect(clips).toEqual([b64('mp3:first'), b64('mp3:second'), b64('mp3:third')]);
    expect(speechCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini-tts', voice: 'coral', response_format: 'mp3' }),
    );
    expect(speechCreateMock.mock.calls[0]?.[0].instructions).toContain('Hindi');
  });

  it('never runs more than 8 requests at once', async () => {
    let inFlight = 0;
    let peak = 0;
    speechCreateMock.mockImplementation(async () => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      return audioResponse('x');
    });

    await synthesizeLines(Array.from({ length: 30 }, (_, i) => `line ${i}`), 'hin');

    expect(peak).toBe(8);
    expect(speechCreateMock).toHaveBeenCalledTimes(30);
  });

  it('retries once on a 429, but not on a 400', async () => {
    speechCreateMock
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce(audioResponse('ok'));
    await expect(synthesizeLines(['a'], 'hin')).resolves.toEqual([b64('ok')]);

    speechCreateMock.mockReset();
    speechCreateMock.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));
    await expect(synthesizeLines(['a'], 'hin')).rejects.toThrow('bad request');
    expect(speechCreateMock).toHaveBeenCalledTimes(1);
  });
});
