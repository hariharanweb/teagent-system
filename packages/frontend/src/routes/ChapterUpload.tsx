import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CHAPTER_FILE_FORMAT_VERSION,
  LANGUAGE_CODES,
  LANGUAGES,
  type ChapterFile,
  type LanguageCode,
} from '@teagent/shared';
import { FileDropzone } from '../components/FileDropzone';
import { extractPagesFromFiles, type PageExtractionProgress } from '../lib/extractPages';
import { readChapterFile, ChapterFileParseError } from '../lib/fileIO';
import { useAuthStore } from '../state/authStore';
import { useChapterStore } from '../state/chapterStore';

function progressLabel(progress: PageExtractionProgress): string {
  const verb = progress.stage === 'uploading' ? 'Uploading' : 'Reading';
  return `${verb} page ${progress.current} of ${progress.total}…`;
}

export function ChapterUpload() {
  const preferredLanguage = useAuthStore((s) => s.profile?.preferredLanguage) as
    | LanguageCode
    | undefined;
  const [language, setLanguage] = useState<LanguageCode>(preferredLanguage ?? 'hin');
  const [chapterTitle, setChapterTitle] = useState('');
  const [progress, setProgress] = useState<PageExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const setChapter = useChapterStore((s) => s.setChapter);
  const navigate = useNavigate();

  async function handlePhotos(files: File[]) {
    setError(null);
    setWarnings([]);
    if (!chapterTitle.trim()) {
      setError('Give this chapter a title first!');
      return;
    }

    const { pages, failure } = await extractPagesFromFiles(files, language, setProgress);
    setProgress(null);

    if (pages.length === 0) {
      setError(failure?.message ?? 'Could not read any of those photos.');
      return;
    }

    const chapter: ChapterFile = {
      formatVersion: CHAPTER_FILE_FORMAT_VERSION,
      language,
      chapterTitle,
      pages,
      createdAt: new Date().toISOString(),
    };
    setChapter(chapter);

    const pageWarnings = pages.flatMap((p) => p.warnings);
    if (failure) {
      setWarnings([
        ...pageWarnings,
        `Stopped after "${failure.fileName}": ${failure.message} The other ${pages.length} page(s) were saved — you can add more from the chapter screen.`,
      ]);
    } else if (pageWarnings.length > 0) {
      setWarnings(pageWarnings);
    }

    navigate('/chapter');
  }

  async function handleReload(files: File[]) {
    setError(null);
    const file = files[0];
    if (!file) return;
    try {
      const chapter = await readChapterFile(file);
      setChapter(chapter);
      navigate('/chapter');
    } catch (err) {
      setError(err instanceof ChapterFileParseError ? err.message : 'Could not load that file.');
    }
  }

  const busy = progress !== null;

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>📸 New Chapter</h1>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Language
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          style={{ width: '100%', marginTop: '0.35rem' }}
        >
          {LANGUAGE_CODES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGES[code].label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: '1.5rem' }}>
        Chapter title
        <input
          value={chapterTitle}
          onChange={(e) => setChapterTitle(e.target.value)}
          placeholder="e.g. Chapter 3"
          style={{ width: '100%', marginTop: '0.35rem' }}
        />
      </label>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <FileDropzone
          label={progress ? progressLabel(progress) : '📷 Take or choose photos (one chapter can have several pages)'}
          accept="image/*"
          multiple
          disabled={busy || !chapterTitle.trim()}
          onFiles={handlePhotos}
        />
        <FileDropzone
          label="📂 Load a saved chapter"
          accept="application/json"
          disabled={busy}
          onFiles={handleReload}
        />
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {warnings.length > 0 && (
        <ul style={{ color: 'var(--color-accent)' }}>
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
