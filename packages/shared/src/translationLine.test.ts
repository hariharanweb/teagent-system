import { describe, expect, it } from 'vitest';
import { translationLinesSchema } from './translationLine.schema.js';

describe('translationLinesSchema', () => {
  it('accepts the exact user-specified Hindi output shape', () => {
    const input = [
      {
        meaning: 'did not take',
        wordByWordMeaning: 'From not took',
        hin: 'से नहीं लिया',
      },
      {
        meaning: 'Time kept on passing by',
        wordByWordMeaning: 'Time passed kept on',
        hin: 'समय बीतता रहा',
      },
    ];
    expect(translationLinesSchema('hin').parse(input)).toEqual(input);
  });

  it('rejects a line missing the language field', () => {
    const input = [{ meaning: 'x', wordByWordMeaning: 'y' }];
    expect(() => translationLinesSchema('hin').parse(input)).toThrow();
  });
});
