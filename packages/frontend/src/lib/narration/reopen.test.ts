import { describe, expect, it } from 'vitest';
import type { ChapterFile } from '@teagent/shared';
import { MP3_BYTES_PER_SECOND } from './audio';
import { assembleNarration } from './assemble';
import { pageFingerprint } from './fingerprint';
import { writeNarrationTag } from './id3';
import { pageLineTexts, type PageNarration } from './pageNarration';
import { NarrationFileError, restoreNarration } from './reopen';

function chapterWith(lines: Record<string, string[]>): ChapterFile {
  return {
    formatVersion: 2,
    language: 'hin',
    chapterTitle: 'अच्छा कौन',
    createdAt: '2026-10-04T00:00:00.000Z',
    pages: Object.entries(lines).map(([pageId, texts]) => ({
      pageId,
      translation: texts.map((hin) => ({ meaning: 'm', wordByWordMeaning: 'w', hin })),
      glossary: [],
      warnings: [],
      createdAt: '2026-10-04T00:00:00.000Z',
    })),
  };
}

async function narrationFor(chapter: ChapterFile, pageId: string, fill: number): Promise<PageNarration> {
  const page = chapter.pages.find((p) => p.pageId === pageId)!;
  return {
    pageId,
    fingerprint: await pageFingerprint('hin', pageLineTexts(page, 'hin')),
    mp3: new Uint8Array(MP3_BYTES_PER_SECOND).fill(fill),
    lines: [{ start: 0, end: 1, words: [{ start: 0, end: 1 }] }],
  };
}

describe('restoreNarration', () => {
  it('restores matching pages with their own audio bytes and skips pages whose text changed', async () => {
    const original = chapterWith({ a: ['सुबह'], b: ['रात'] });
    const file = assembleNarration('hin', original.pages, {
      a: await narrationFor(original, 'a', 1),
      b: await narrationFor(original, 'b', 2),
    })!.file;

    const edited = chapterWith({ a: ['सुबह'], b: ['दोपहर'] });
    const { restored, skipped } = await restoreNarration(file, edited);

    expect(restored.map((p) => p.pageId)).toEqual(['a']);
    expect(restored[0]!.mp3.every((b) => b === 1)).toBe(true);
    expect(skipped).toBe(1);
  });

  it('fingerprints are stable for the same text', async () => {
    expect(await pageFingerprint('hin', ['क'])).toBe(await pageFingerprint('hin', ['क']));
    expect(await pageFingerprint('hin', ['क'])).not.toBe(await pageFingerprint('kan', ['क']));
  });

  it('rejects an MP3 that has no narration tag, or a different language', async () => {
    const chapter = chapterWith({ a: ['सुबह'] });
    await expect(restoreNarration(Uint8Array.of(0xff, 0xf3, 0), chapter)).rejects.toThrow(NarrationFileError);

    const kanTag = writeNarrationTag(new Uint8Array(), JSON.stringify({ v: 1, language: 'kan', pages: [] }));
    await expect(restoreNarration(kanTag, chapter)).rejects.toThrow('different language');
  });
});
