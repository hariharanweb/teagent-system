import { describe, expect, it } from 'vitest';
import { translationLinesSchema } from './translationLine.schema.js';
import { chapterFileSchema, CHAPTER_FILE_FORMAT_VERSION } from './chapter.schema.js';

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

describe('chapterFileSchema', () => {
  it('round-trips a valid Kannada chapter file', () => {
    const file = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'kan',
      chapterTitle: 'Chapter 1',
      translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', kan: 'ನಮಸ್ಕಾರ' }],
      glossary: [{ word: 'ನಮಸ್ಕಾರ', language: 'kan', meaning: 'hello', synonyms: ['ನಮಸ್ತೆ'] }],
      warnings: [],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    expect(chapterFileSchema.parse(file)).toEqual(file);
  });

  it('flags a translation line missing the declared language field', () => {
    const file = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'hin',
      chapterTitle: 'Chapter 1',
      translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', kan: 'wrong-lang-field' }],
      glossary: [],
      warnings: [],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    expect(() => chapterFileSchema.parse(file)).toThrow();
  });
});
