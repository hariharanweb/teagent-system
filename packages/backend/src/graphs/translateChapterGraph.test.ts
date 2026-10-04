import { describe, expect, it, vi, beforeEach } from 'vitest';

const translationInvokeMock = vi.fn();
const textInvokeMock = vi.fn();

vi.mock('../llm/openaiClients.js', () => ({
  getTranslationModel: async () => ({ invoke: translationInvokeMock }),
  getTextModel: async () => ({ invoke: textInvokeMock }),
}));

const { translateChapterGraph, findMisalignment, toSentenceSections } = await import('./translateChapterGraph.js');

const transcript = [
  { section: 'Title', heading: null, lines: ['ಹಂಚಿ ತಿನ್ನೋಣ (ಕಿರು ನಾಟಕ)'] },
  {
    section: 'Narration',
    heading: 'ಪಾಠ ಪರಿಚಯ',
    lines: ['ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ', 'ವಾಸ ಮಾಡುತ್ತಿದ್ದರು. ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.'],
  },
];

const m = (meaning: string) => ({ meaning, wordByWordMeaning: `${meaning} (w)` });
const aligned = [
  { heading: null, lines: [m("Let's share and eat")] },
  { heading: m('Introduction'), lines: [m('Balu and Setu lived in the same compound.'), m('It was mango season.')] },
];

describe('toSentenceSections / findMisalignment', () => {
  it('splits each section into sentences in code', () => {
    expect(toSentenceSections(transcript)[1]).toEqual({
      heading: 'ಪಾಠ ಪರಿಚಯ',
      sentences: ['ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ ವಾಸ ಮಾಡುತ್ತಿದ್ದರು.', 'ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.'],
    });
  });

  it('drops a heading the model repeated as the first line', () => {
    expect(toSentenceSections([{ section: 'Panel', heading: 'ಪಾಠ ಪರಿಚಯ', lines: ['ಪಾಠ ಪರಿಚಯ', 'ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.'] }])).toEqual([
      { heading: 'ಪಾಠ ಪರಿಚಯ', sentences: ['ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.'] },
    ]);
  });

  it('flags a dropped line, a missing heading and a missing section', () => {
    const input = toSentenceSections(transcript);
    expect(findMisalignment(input, aligned)).toBeNull();
    expect(findMisalignment(input, [aligned[0]!, { heading: null, lines: [m('x')] }])).toBe(
      'section 2: heading should be translated\nsection 2: expected 2 lines but got 1',
    );
    expect(findMisalignment(input, [])).toBe('Expected 2 sections but got 0.');
  });
});

describe('translateChapterGraph', () => {
  beforeEach(() => {
    translationInvokeMock.mockReset();
    textInvokeMock.mockReset().mockResolvedValue({ content: '[]' });
  });

  it('attaches the original text from the transcript, never from the model', async () => {
    translationInvokeMock.mockResolvedValueOnce({ content: JSON.stringify(aligned) });

    const result = await translateChapterGraph.invoke({ language: 'kan', transcript });

    expect(result.translationLines.map((l) => [l.section, l.kan, l.meaning])).toEqual([
      ['Title', 'ಹಂಚಿ ತಿನ್ನೋಣ (ಕಿರು ನಾಟಕ)', "Let's share and eat"],
      ['Narration', 'ಪಾಠ ಪರಿಚಯ', 'Introduction'],
      ['Narration', 'ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ ವಾಸ ಮಾಡುತ್ತಿದ್ದರು.', 'Balu and Setu lived in the same compound.'],
      ['Narration', 'ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.', 'It was mango season.'],
    ]);
    expect(result.warnings).toHaveLength(0);
    expect(textInvokeMock).toHaveBeenCalledTimes(1);
  });

  it('retries with the misalignment described when a line is dropped', async () => {
    translationInvokeMock
      .mockResolvedValueOnce({ content: JSON.stringify([aligned[0], { heading: m('Introduction'), lines: [m('only one')] }]) })
      .mockResolvedValueOnce({ content: JSON.stringify(aligned) });

    const result = await translateChapterGraph.invoke({ language: 'kan', transcript });

    expect(translationInvokeMock).toHaveBeenCalledTimes(2);
    expect(translationInvokeMock.mock.calls[1]![0].at(-1).content).toContain('section 2: expected 2 lines but got 1');
    expect(result.translationLines).toHaveLength(4);
    expect(result.warnings).toHaveLength(0);
  });

  it('still shows every original sentence, with a warning, if the model never lines up', async () => {
    translationInvokeMock.mockResolvedValue({ content: JSON.stringify([aligned[0], { heading: null, lines: [] }]) });

    const result = await translateChapterGraph.invoke({ language: 'kan', transcript });

    expect(result.translationLines.map((l) => l.kan)).toEqual([
      'ಹಂಚಿ ತಿನ್ನೋಣ (ಕಿರು ನಾಟಕ)',
      'ಪಾಠ ಪರಿಚಯ',
      'ಬಾಲು ಮತ್ತು ಸೇತು ಒಂದೇ ವಠಾರದಲ್ಲಿ ವಾಸ ಮಾಡುತ್ತಿದ್ದರು.',
      'ಅದು ಮಾವಿನ ಹಣ್ಣಿನ ಕಾಲ.',
    ]);
    expect(result.translationLines[3]?.meaning).toBe('—');
    expect(result.warnings).toEqual(['Some meanings may not line up with their sentence — compare with the book.']);
  });

  it('reports a failure and skips the glossary when the output is never valid JSON', async () => {
    translationInvokeMock.mockResolvedValue({ content: 'nope' });

    const result = await translateChapterGraph.invoke({ language: 'kan', transcript });

    expect(result.translationLines).toHaveLength(0);
    expect(result.warnings.some((w) => w.startsWith('translation failed after 2 attempts'))).toBe(true);
    expect(textInvokeMock).not.toHaveBeenCalled();
  });
});
