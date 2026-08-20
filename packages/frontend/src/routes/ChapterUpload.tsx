import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from '@teagent/shared';
import { FileDropzone } from '../components/FileDropzone';
import { normalizeImageForUpload, ImageValidationError } from '../lib/imageValidation';
import { readChapterFile, ChapterFileParseError } from '../lib/fileIO';
import { uploadChapterImage } from '../api/uploadsApi';
import { extractChapter } from '../api/chaptersApi';
import { ApiError } from '../api/client';
import { useAuthStore } from '../state/authStore';
import { useChapterStore } from '../state/chapterStore';

type Stage = 'idle' | 'uploading' | 'extracting';

export function ChapterUpload() {
  const preferredLanguage = useAuthStore((s) => s.profile?.preferredLanguage) as
    | LanguageCode
    | undefined;
  const [language, setLanguage] = useState<LanguageCode>(preferredLanguage ?? 'hin');
  const [chapterTitle, setChapterTitle] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const setChapter = useChapterStore((s) => s.setChapter);
  const navigate = useNavigate();

  async function handlePhoto(file: File) {
    setError(null);
    setWarnings([]);
    if (!chapterTitle.trim()) {
      setError('Give this chapter a title first!');
      return;
    }
    try {
      setStage('uploading');
      const normalized = await normalizeImageForUpload(file);
      const s3Key = await uploadChapterImage(normalized, language);

      setStage('extracting');
      const result = await extractChapter({ s3Key, language, chapterTitle });
      setChapter(result);
      if (result.warnings.length > 0) setWarnings(result.warnings);
      navigate('/chapter');
    } catch (err) {
      if (err instanceof ImageValidationError) setError(err.message);
      else if (err instanceof ApiError) setError(err.message);
      else setError("Couldn't read this page clearly — try a clearer photo.");
    } finally {
      setStage('idle');
    }
  }

  async function handleReload(file: File) {
    setError(null);
    try {
      const chapter = await readChapterFile(file);
      setChapter(chapter);
      navigate('/chapter');
    } catch (err) {
      setError(err instanceof ChapterFileParseError ? err.message : 'Could not load that file.');
    }
  }

  const busy = stage !== 'idle';

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
          label={stage === 'uploading' ? 'Uploading…' : stage === 'extracting' ? 'Reading page…' : '📷 Take or choose a photo'}
          accept="image/*"
          capture
          disabled={busy}
          onFile={handlePhoto}
        />
        <FileDropzone
          label="📂 Load a saved chapter"
          accept="application/json"
          disabled={busy}
          onFile={handleReload}
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
