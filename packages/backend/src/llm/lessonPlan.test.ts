import { describe, expect, it, vi, beforeEach } from 'vitest';

const invokeMock = vi.fn();

vi.mock('./openaiClients.js', () => ({
  getTextModel: async () => ({ invoke: invokeMock }),
}));

const { generateLessonPlan } = await import('./lessonPlan.js');

describe('generateLessonPlan', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('returns the model output as-is', async () => {
    const markdown = '## Quick Summary\n- A king wants gold.\n\n## Remembering the Words\n| Word | Meaning | How to remember it |';
    invokeMock.mockResolvedValueOnce({ content: markdown });

    const result = await generateLessonPlan({
      language: 'hin',
      chapterTitle: 'सुनहरा स्पर्श',
      translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', hin: 'नमस्ते' }],
      glossary: [],
    });

    expect(result).toBe(markdown);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});
