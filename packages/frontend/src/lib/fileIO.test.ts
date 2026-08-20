import { describe, expect, it } from 'vitest';
import { readChapterFile, ChapterFileParseError } from './fileIO';

function jsonFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'chapter.json', { type: 'application/json' });
}

describe('readChapterFile', () => {
  it('parses a valid chapter file', async () => {
    const file = jsonFile({
      formatVersion: 1,
      language: 'hin',
      chapterTitle: 'Chapter 1',
      translation: [{ meaning: 'hello', wordByWordMeaning: 'hello', hin: 'नमस्ते' }],
      glossary: [],
      warnings: [],
      createdAt: new Date('2026-01-01').toISOString(),
    });
    const chapter = await readChapterFile(file);
    expect(chapter.chapterTitle).toBe('Chapter 1');
  });

  it('throws a friendly error for invalid JSON', async () => {
    const file = new File(['not json'], 'chapter.json', { type: 'application/json' });
    await expect(readChapterFile(file)).rejects.toBeInstanceOf(ChapterFileParseError);
  });

  it('throws a friendly error for JSON that does not match the schema', async () => {
    const file = jsonFile({ hello: 'world' });
    await expect(readChapterFile(file)).rejects.toBeInstanceOf(ChapterFileParseError);
  });
});
