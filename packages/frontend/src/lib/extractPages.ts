import type { ChapterPage, LanguageCode } from '@teagent/shared';
import { normalizeImageForUpload, ImageValidationError } from './imageValidation';
import { uploadChapterImage } from '../api/uploadsApi';
import { extractChapter, translateChapter } from '../api/chaptersApi';
import { ApiError } from '../api/client';

export interface PageExtractionProgress {
  current: number;
  total: number;
  stage: 'uploading' | 'reading' | 'translating';
}

const STAGE_VERB: Record<PageExtractionProgress['stage'], string> = {
  uploading: 'Uploading',
  reading: 'Reading',
  translating: 'Translating',
};

export function progressLabel(progress: PageExtractionProgress): string {
  return `${STAGE_VERB[progress.stage]} page ${progress.current} of ${progress.total}…`;
}

export interface ExtractPagesResult {
  pages: ChapterPage[];
  /** Set if a file failed partway through — pages[] still holds everything that succeeded before it. */
  failure?: { fileName: string; message: string };
}

/**
 * Uploads, transcribes and translates each file in order, one page per file. Stops on the first failure but
 * returns whatever pages succeeded first, so the caller can keep partial progress rather than
 * losing it (a batch of 5 photos shouldn't be thrown away because photo 3 was blurry).
 */
export async function extractPagesFromFiles(
  files: File[],
  language: LanguageCode,
  onProgress?: (progress: PageExtractionProgress) => void,
): Promise<ExtractPagesResult> {
  const pages: ChapterPage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    try {
      onProgress?.({ current: i + 1, total: files.length, stage: 'uploading' });
      const normalized = await normalizeImageForUpload(file);
      const s3Key = await uploadChapterImage(normalized, language);

      onProgress?.({ current: i + 1, total: files.length, stage: 'reading' });
      const extracted = await extractChapter({ s3Key, language });

      // Translating is a separate request so the original text can't be "corrected" while translating.
      onProgress?.({ current: i + 1, total: files.length, stage: 'translating' });
      const result = await translateChapter({ language, transcript: extracted.transcript });

      pages.push({
        pageId: crypto.randomUUID(),
        translation: result.translation,
        glossary: result.glossary,
        warnings: [...extracted.warnings, ...result.warnings],
        createdAt: result.createdAt,
      });
    } catch (err) {
      const message =
        err instanceof ImageValidationError || err instanceof ApiError
          ? err.message
          : "Couldn't read this page clearly — try a clearer photo.";
      return { pages, failure: { fileName: file.name, message } };
    }
  }

  return { pages };
}
