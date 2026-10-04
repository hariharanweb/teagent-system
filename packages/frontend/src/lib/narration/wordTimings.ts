import { graphemeCount } from './words';

export interface Span {
  start: number;
  end: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * OpenAI TTS gives no word timestamps, so a line's exact [start, end] is split across its words
 * in proportion to their length — longer words take longer to say.
 */
export function estimateWordTimings(start: number, end: number, words: string[]): Span[] {
  if (words.length === 0) return [];
  const weights = words.map((w) => Math.max(1, graphemeCount(w)));
  const total = weights.reduce((a, b) => a + b, 0);
  const duration = end - start;

  let cursor = start;
  return weights.map((weight, i) => {
    const wordStart = cursor;
    cursor = i === weights.length - 1 ? end : cursor + (duration * weight) / total;
    return { start: round3(wordStart), end: round3(cursor) };
  });
}
