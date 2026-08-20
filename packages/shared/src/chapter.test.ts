import { describe, expect, it } from 'vitest';
import {
  chapterFileSchema,
  CHAPTER_FILE_FORMAT_VERSION,
  flattenChapterGlossary,
  flattenChapterTranslation,
  type ChapterFile,
} from './chapter.schema.js';

function page(pageId: string, kan: string, word: string) {
  return {
    pageId,
    translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', kan }],
    glossary: [{ word, language: 'kan' as const, meaning: 'hello', synonyms: ['ನಮಸ್ತೆ'] }],
    warnings: [],
    createdAt: new Date('2026-01-01').toISOString(),
  };
}

describe('chapterFileSchema', () => {
  it('round-trips a valid multi-page Kannada chapter file', () => {
    const file: ChapterFile = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'kan',
      chapterTitle: 'Chapter 1',
      pages: [
        page('11111111-1111-1111-1111-111111111111', 'ನಮಸ್ಕಾರ', 'ನಮಸ್ಕಾರ'),
        page('22222222-2222-2222-2222-222222222222', 'ಶುಭ ದಿನ', 'ಶುಭ'),
      ],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    expect(chapterFileSchema.parse(file)).toEqual(file);
  });

  it('flags a translation line missing the declared language field', () => {
    const file = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'hin',
      chapterTitle: 'Chapter 1',
      pages: [
        {
          pageId: '11111111-1111-1111-1111-111111111111',
          translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', kan: 'wrong-lang-field' }],
          glossary: [],
          warnings: [],
          createdAt: new Date('2026-01-01').toISOString(),
        },
      ],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    expect(() => chapterFileSchema.parse(file)).toThrow();
  });

  it('rejects a chapter with zero pages', () => {
    const file = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'hin',
      chapterTitle: 'Chapter 1',
      pages: [],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    expect(() => chapterFileSchema.parse(file)).toThrow();
  });
});

describe('flattenChapterTranslation', () => {
  it('concatenates translation lines across pages in order', () => {
    const chapter: ChapterFile = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'kan',
      chapterTitle: 'Chapter 1',
      pages: [
        page('11111111-1111-1111-1111-111111111111', 'ಪುಟ ಒಂದು', 'ಪುಟ'),
        page('22222222-2222-2222-2222-222222222222', 'ಪುಟ ಎರಡು', 'ಎರಡು'),
      ],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    const lines = flattenChapterTranslation(chapter);
    expect(lines).toHaveLength(2);
    expect((lines[0] as Record<string, string>).kan).toBe('ಪುಟ ಒಂದು');
    expect((lines[1] as Record<string, string>).kan).toBe('ಪುಟ ಎರಡು');
  });
});

describe('flattenChapterGlossary', () => {
  it('de-duplicates entries by word+language across pages, keeping the first occurrence', () => {
    const chapter: ChapterFile = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language: 'kan',
      chapterTitle: 'Chapter 1',
      pages: [
        page('11111111-1111-1111-1111-111111111111', 'ಪುಟ ಒಂದು', 'ಪುಟ'),
        page('22222222-2222-2222-2222-222222222222', 'ಪುಟ ಎರಡು', 'ಪುಟ'), // same word again
      ],
      createdAt: new Date('2026-01-01').toISOString(),
    };
    const glossary = flattenChapterGlossary(chapter);
    expect(glossary).toHaveLength(1);
    expect(glossary[0]?.word).toBe('ಪುಟ');
  });
});
