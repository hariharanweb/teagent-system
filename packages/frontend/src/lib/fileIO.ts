import { chapterFileSchema, type ChapterFile } from '@teagent/shared';

export function downloadChapterFile(chapter: ChapterFile): void {
  const blob = new Blob([JSON.stringify(chapter, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeTitle = chapter.chapterTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  anchor.href = url;
  anchor.download = `${safeTitle || 'chapter'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export class ChapterFileParseError extends Error {}

// jsdom's Blob/File polyfill (used under the vitest "jsdom" test environment) doesn't implement
// Blob.text(), so FileReader is used instead — it works consistently in both real browsers and tests.
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsText(file);
  });
}

/** Validates a reloaded file with zod so a hand-edited or corrupted file fails gracefully. */
export async function readChapterFile(file: File): Promise<ChapterFile> {
  const text = await readFileAsText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ChapterFileParseError('This file is not valid JSON.');
  }

  const result = chapterFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new ChapterFileParseError(
      "This doesn't look like a saved chapter file — it may be corrupted or from a different app.",
    );
  }
  return result.data;
}
