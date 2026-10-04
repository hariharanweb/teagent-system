import { describe, expect, it } from 'vitest';
import type { ChapterPage } from '@teagent/shared';
import { MP3_BYTES_PER_SECOND } from './audio';
import { assembleNarration, cueAt } from './assemble';
import { readNarrationTag } from './id3';
import type { PageNarration } from './pageNarration';
import { layoutLines, pausesAfterLines } from './pageNarration';

const page = (pageId: string): ChapterPage => ({
  pageId,
  translation: [],
  glossary: [],
  warnings: [],
  createdAt: '2026-10-04T00:00:00.000Z',
});

const narration = (pageId: string, seconds: number): PageNarration => ({
  pageId,
  fingerprint: `fp-${pageId}`,
  mp3: new Uint8Array(seconds * MP3_BYTES_PER_SECOND),
  lines: [{ start: 0.5, end: 1.5, words: [{ start: 0.5, end: 1 }, { start: 1, end: 1.5 }] }],
});

describe('assembleNarration', () => {
  it('orders pages as in the chapter, offsets cues by earlier pages, and skips unnarrated pages', () => {
    const result = assembleNarration('hin', [page('a'), page('b'), page('c')], {
      c: narration('c', 2),
      a: narration('a', 3),
    })!;

    expect(result.narratedPageIds).toEqual(['a', 'c']);
    expect(result.cues.map((c) => [c.pageId, c.wordIndex, c.start])).toEqual([
      ['a', 0, 0.5],
      ['a', 1, 1],
      ['c', 0, 3.5],
      ['c', 1, 4],
    ]);
    const tag = JSON.parse(readNarrationTag(result.file).json!);
    expect(tag.pages.map((p: { pageId: string; byteLength: number }) => [p.pageId, p.byteLength])).toEqual([
      ['a', 3 * MP3_BYTES_PER_SECOND],
      ['c', 2 * MP3_BYTES_PER_SECOND],
    ]);
  });

  it('returns null when nothing is narrated', () => {
    expect(assembleNarration('hin', [page('a')], {})).toBeNull();
  });
});

describe('cueAt', () => {
  const cues = assembleNarration('hin', [page('a')], { a: narration('a', 3) })!.cues;

  it('finds the word being spoken, and nothing during pauses', () => {
    expect(cueAt(cues, 0.7)?.wordIndex).toBe(0);
    expect(cueAt(cues, 1.2)?.wordIndex).toBe(1);
    expect(cueAt(cues, 0.2)).toBeNull();
    expect(cueAt(cues, 2)).toBeNull();
  });
});

describe('page layout', () => {
  it('pauses longer between sections and at the page end', () => {
    const p = page('a');
    p.translation = [
      { meaning: 'm', wordByWordMeaning: 'w', hin: 'क', section: 'Box' },
      { meaning: 'm', wordByWordMeaning: 'w', hin: 'ख', section: 'Story' },
      { meaning: 'm', wordByWordMeaning: 'w', hin: 'ग', section: 'Story' },
    ];
    expect(pausesAfterLines(p)).toEqual([0.9, 0.4, 1.2]);
  });

  it('places clips back to back with their pauses', () => {
    const { spans, totalSamples } = layoutLines([24_000, 12_000], [0.5, 1]);
    expect(spans).toEqual([
      { start: 0, end: 1 },
      { start: 1.5, end: 2 },
    ]);
    expect(totalSamples).toBe(24_000 * 3);
  });
});
