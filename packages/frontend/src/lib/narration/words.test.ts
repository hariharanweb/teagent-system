import { describe, expect, it } from 'vitest';
import { graphemeCount, segmentWords, spokenWords } from './words';

describe('segmentWords', () => {
  it('indexes only spoken words, keeping punctuation and spaces as plain segments', () => {
    const segments = segmentWords('मैं दिन की शुरूआत करती हूँ।', 'hi');

    expect(segments.map((s) => s.text).join('')).toBe('मैं दिन की शुरूआत करती हूँ।');
    expect(spokenWords('मैं दिन की शुरूआत करती हूँ।', 'hi')).toEqual(['मैं', 'दिन', 'की', 'शुरूआत', 'करती', 'हूँ']);
    expect(segments.at(-1)).toEqual({ text: '।', wordIndex: null });
  });

  it('handles Kannada', () => {
    expect(spokenWords('ಒಂದು ಕಾಡಿನಲ್ಲಿ ಆನೆ ಇತ್ತು.', 'kn')).toEqual(['ಒಂದು', 'ಕಾಡಿನಲ್ಲಿ', 'ಆನೆ', 'ಇತ್ತು']);
  });
});

describe('graphemeCount', () => {
  it('counts a letter with its matra as one', () => {
    expect(graphemeCount('की')).toBe(1);
    expect(graphemeCount('दिन')).toBe(2);
  });
});
