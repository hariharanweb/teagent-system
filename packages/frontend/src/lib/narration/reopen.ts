import { narrationTagSchema, type ChapterFile } from '@teagent/shared';
import { pageFingerprint } from './fingerprint';
import { readNarrationTag } from './id3';
import { pageLineTexts, type PageNarration } from './pageNarration';

export class NarrationFileError extends Error {}

export interface RestoreResult {
  restored: PageNarration[];
  /** Pages in the file whose text no longer matches this chapter (or that aren't in it). */
  skipped: number;
}

/** Rebuilds Page narrations from a downloaded Narration file, keeping only pages that still match. */
export async function restoreNarration(bytes: Uint8Array, chapter: ChapterFile): Promise<RestoreResult> {
  const { json, audioStart } = readNarrationTag(bytes);
  if (!json) throw new NarrationFileError("This MP3 wasn't saved from this app, so it can't be reopened here.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new NarrationFileError('This narration file is damaged.');
  }
  const tag = narrationTagSchema.safeParse(parsed);
  if (!tag.success) throw new NarrationFileError('This narration file is damaged.');
  if (tag.data.language !== chapter.language) {
    throw new NarrationFileError('This narration is for a chapter in a different language.');
  }

  const restored: PageNarration[] = [];
  let skipped = 0;
  let cursor = audioStart;
  for (const page of tag.data.pages) {
    const mp3 = bytes.slice(cursor, cursor + page.byteLength);
    cursor += page.byteLength;

    const chapterPage = chapter.pages.find((p) => p.pageId === page.pageId);
    const matches =
      chapterPage &&
      mp3.length === page.byteLength &&
      (await pageFingerprint(chapter.language, pageLineTexts(chapterPage, chapter.language))) === page.fingerprint;
    if (!matches) {
      skipped++;
      continue;
    }
    restored.push({ pageId: page.pageId, fingerprint: page.fingerprint, mp3, lines: page.lines });
  }
  return { restored, skipped };
}
