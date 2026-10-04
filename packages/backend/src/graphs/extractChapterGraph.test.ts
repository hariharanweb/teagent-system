import { describe, expect, it, vi, beforeEach } from 'vitest';

const visionInvokeMock = vi.fn();

vi.mock('../llm/openaiClients.js', () => ({
  getVisionModel: async () => ({ invoke: visionInvokeMock }),
}));

vi.mock('../s3/presign.js', () => ({
  resolveVisionImageUrl: async (key: string) => `https://example.com/${key}?signed=1`,
}));

const { extractChapterGraph } = await import('./extractChapterGraph.js');

const transcript = [
  { section: 'Title', heading: null, lines: ['ಹಂಚಿ ತಿನ್ನೋಣ'] },
  { section: 'Narration', heading: null, lines: ['ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ', 'ವಾಸ ಮಾಡುತ್ತಿದ್ದರು.'] },
];

describe('extractChapterGraph (transcription)', () => {
  beforeEach(() => {
    visionInvokeMock.mockReset();
  });

  it('returns the page transcript on the first attempt, sending the image at high detail', async () => {
    visionInvokeMock.mockResolvedValueOnce({ content: JSON.stringify(transcript) });

    const result = await extractChapterGraph.invoke({ imageS3Key: 'uploads/p1/img.jpg', language: 'kan' });

    expect(result.transcript).toEqual(transcript);
    expect(result.warnings).toHaveLength(0);
    const [, human] = visionInvokeMock.mock.calls[0]![0];
    expect(human.content[0].image_url).toEqual({ url: 'https://example.com/uploads/p1/img.jpg?signed=1', detail: 'high' });
  });

  it('retries once with a repair prompt, then gives up with a warning', async () => {
    visionInvokeMock.mockResolvedValueOnce({ content: 'not json' }).mockResolvedValueOnce({ content: 'still not json' });

    const result = await extractChapterGraph.invoke({ imageS3Key: 'uploads/p1/img.jpg', language: 'kan' });

    expect(visionInvokeMock).toHaveBeenCalledTimes(2);
    expect(visionInvokeMock.mock.calls[1]![0]).toHaveLength(3); // system + image + repair prompt
    expect(result.transcript).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('failed schema validation'))).toBe(true);
  });

  it('recovers when the retry is valid', async () => {
    visionInvokeMock.mockResolvedValueOnce({ content: 'garbled' }).mockResolvedValueOnce({ content: JSON.stringify(transcript) });

    const result = await extractChapterGraph.invoke({ imageS3Key: 'uploads/p1/img.jpg', language: 'kan' });

    expect(result.transcript).toEqual(transcript);
  });
});
