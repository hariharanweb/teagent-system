import type { ChapterPage, LanguageCode } from '@teagent/shared';
import { normalizeImageForUpload, ImageValidationError } from './imageValidation';
import { uploadChapterImage } from '../api/uploadsApi';
import { extractChapter } from '../api/chaptersApi';
import { ApiError } from '../api/client';

export interface PageExtractionProgress {
  current: number;
  total: number;
  stage: 'uploading' | 'reading';
}

export interface ExtractPagesResult {
  pages: ChapterPage[];
  /** Set if a file failed partway through — pages[] still holds everything that succeeded before it. */
  failure?: { fileName: string; message: string };
}

/**
 * Uploads + extracts each file in order, one page per file. Stops on the first failure but
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
      const result = await extractChapter({ s3Key, language });

      pages.push({
        pageId: crypto.randomUUID(),
        translation: result.translation,
        glossary: result.glossary,
        warnings: result.warnings,
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
