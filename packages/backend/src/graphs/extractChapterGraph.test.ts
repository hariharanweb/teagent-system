import { describe, expect, it, vi, beforeEach } from 'vitest';

const visionInvokeMock = vi.fn();
const textInvokeMock = vi.fn();

vi.mock('../llm/openaiClients.js', () => ({
  getVisionModel: async () => ({ invoke: visionInvokeMock }),
  getTextModel: async () => ({ invoke: textInvokeMock }),
}));

vi.mock('../s3/presign.js', () => ({
  resolveVisionImageUrl: async (key: string) => `https://example.com/${key}?signed=1`,
}));

const { extractChapterGraph } = await import('./extractChapterGraph.js');

describe('extractChapterGraph', () => {
  beforeEach(() => {
    visionInvokeMock.mockReset();
    textInvokeMock.mockReset();
  });

  it('extracts and generates a glossary on the first attempt', async () => {
    visionInvokeMock.mockResolvedValueOnce({
      content: JSON.stringify([
        { meaning: 'did not take', wordByWordMeaning: 'From not took', hin: 'से नहीं लिया' },
      ]),
    });
    textInvokeMock.mockResolvedValueOnce({
      content: JSON.stringify([
        { word: 'लिया', language: 'hin', meaning: 'took', synonyms: ['ग्रहण किया'] },
      ]),
    });

    const result = await extractChapterGraph.invoke({
      imageS3Key: 'uploads/p1/img.jpg',
      language: 'hin',
    });

    expect(result.translationLines).toHaveLength(1);
    expect(result.translationLines[0]?.hin).toBe('से नहीं लिया');
    expect(result.glossary).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(visionInvokeMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on invalid JSON then records a warning if still invalid', async () => {
    visionInvokeMock
      .mockResolvedValueOnce({ content: 'not json' })
      .mockResolvedValueOnce({ content: 'still not json' });

    const result = await extractChapterGraph.invoke({
      imageS3Key: 'uploads/p1/img.jpg',
      language: 'hin',
    });

    expect(visionInvokeMock).toHaveBeenCalledTimes(2);
    expect(result.translationLines).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('failed schema validation'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('skipped glossary generation'))).toBe(true);
    expect(textInvokeMock).not.toHaveBeenCalled();
  });

  it('recovers after one retry when the second attempt is valid', async () => {
    visionInvokeMock
      .mockResolvedValueOnce({ content: 'garbled output' })
      .mockResolvedValueOnce({
        content: JSON.stringify([
          { meaning: 'hello', wordByWordMeaning: 'hello', hin: 'नमस्ते' },
        ]),
      });
    textInvokeMock.mockResolvedValueOnce({ content: '[]' });

    const result = await extractChapterGraph.invoke({
      imageS3Key: 'uploads/p1/img.jpg',
      language: 'hin',
    });

    expect(visionInvokeMock).toHaveBeenCalledTimes(2);
    expect(result.translationLines).toHaveLength(1);
    expect(result.glossary).toHaveLength(0);
  });
});
