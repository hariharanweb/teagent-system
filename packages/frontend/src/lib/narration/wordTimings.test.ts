import { describe, expect, it } from 'vitest';
import { estimateWordTimings } from './wordTimings';

describe('estimateWordTimings', () => {
  it('fills the line exactly, in order, giving longer words more time', () => {
    const spans = estimateWordTimings(10, 12, ['की', 'शुरूआत', 'हूँ']);

    expect(spans[0]!.start).toBe(10);
    expect(spans.at(-1)!.end).toBe(12);
    spans.forEach((s, i) => {
      expect(s.end).toBeGreaterThan(s.start);
      if (i > 0) expect(s.start).toBe(spans[i - 1]!.end);
    });
    const length = (i: number) => spans[i]!.end - spans[i]!.start;
    expect(length(1)).toBeGreaterThan(length(0));
  });

  it('returns nothing for a line with no words', () => {
    expect(estimateWordTimings(0, 1, [])).toEqual([]);
  });
});
