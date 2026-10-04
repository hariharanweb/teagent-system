import type { ChapterPage, LanguageCode, NarrationTag } from '@teagent/shared';
import { MP3_BYTES_PER_SECOND } from './audio';
import { writeNarrationTag } from './id3';
import type { PageNarration } from './pageNarration';

/** A word's position in the chapter and its absolute time in the assembled Narration. */
export interface WordCue {
  pageId: string;
  lineIndex: number;
  wordIndex: number;
  start: number;
  end: number;
}

export interface AssembledNarration {
  /** The Narration file: every narrated page's audio in chapter order, with the ID3 timing tag. */
  file: Uint8Array;
  cues: WordCue[];
  narratedPageIds: string[];
}

export function assembleNarration(
  language: LanguageCode,
  chapterPages: ChapterPage[],
  pages: Record<string, PageNarration>,
): AssembledNarration | null {
  const ordered = chapterPages.map((p) => pages[p.pageId]).filter((p): p is PageNarration => !!p);
  if (ordered.length === 0) return null;

  const cues: WordCue[] = [];
  let offset = 0;
  for (const page of ordered) {
    page.lines.forEach((line, lineIndex) =>
      line.words.forEach((word, wordIndex) =>
        cues.push({ pageId: page.pageId, lineIndex, wordIndex, start: offset + word.start, end: offset + word.end }),
      ),
    );
    offset += page.mp3.length / MP3_BYTES_PER_SECOND;
  }

  const tag: NarrationTag = {
    v: 1,
    language,
    pages: ordered.map((p) => ({ pageId: p.pageId, fingerprint: p.fingerprint, byteLength: p.mp3.length, lines: p.lines })),
  };
  const audio = new Uint8Array(ordered.reduce((n, p) => n + p.mp3.length, 0));
  let at = 0;
  for (const page of ordered) {
    audio.set(page.mp3, at);
    at += page.mp3.length;
  }

  return {
    file: writeNarrationTag(audio, JSON.stringify(tag)),
    cues,
    narratedPageIds: ordered.map((p) => p.pageId),
  };
}

/** The word being spoken at `time`, if any (cues are sorted by start). */
export function cueAt(cues: WordCue[], time: number): WordCue | null {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid]!.start <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const cue = found >= 0 ? cues[found]! : null;
  return cue && time < cue.end ? cue : null;
}
