import { lazy, Suspense, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MAX_PAGES_PER_CHAPTER, flattenChapterGlossary } from '@teagent/shared';
import { useChapterStore } from '../state/chapterStore';
import { TranslationLine } from '../components/TranslationLine';
import { FileDropzone } from '../components/FileDropzone';
import { downloadChapterFile } from '../lib/fileIO';
import { extractPagesFromFiles, type PageExtractionProgress } from '../lib/extractPages';
import { ChatPanel } from './ChatPanel';
import { Glossary } from './Glossary';

// react-markdown/remark-gfm are only needed for this one tab — lazy-load so they don't bloat the
// initial bundle every screen pays for.
const LessonPlan = lazy(() => import('./LessonPlan').then((m) => ({ default: m.LessonPlan })));

type Tab = 'translation' | 'glossary' | 'lessonPlan';

const TAB_LABELS: Record<Tab, string> = {
  translation: 'Translation',
  glossary: 'Glossary',
  lessonPlan: 'Lesson Plan',
};

function progressLabel(progress: PageExtractionProgress): string {
  const verb = progress.stage === 'uploading' ? 'Uploading' : 'Reading';
  return `${verb} page ${progress.current} of ${progress.total}…`;
}

export function ChapterViewer() {
  const chapter = useChapterStore((s) => s.chapter);
  const clearChapter = useChapterStore((s) => s.clearChapter);
  const appendPages = useChapterStore((s) => s.appendPages);
  const [tab, setTab] = useState<Tab>('translation');
  const [chatOpen, setChatOpen] = useState(false);
  const [addProgress, setAddProgress] = useState<PageExtractionProgress | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!chapter) return <Navigate to="/upload" replace />;

  const glossary = flattenChapterGlossary(chapter);
  const pageWarnings = chapter.pages.flatMap((p) => p.warnings);
  const atPageLimit = chapter.pages.length >= MAX_PAGES_PER_CHAPTER;

  async function handleAddPages(files: File[]) {
    if (!chapter) return;
    setAddError(null);
    const { pages, failure } = await extractPagesFromFiles(files, chapter.language, setAddProgress);
    setAddProgress(null);
    if (pages.length > 0) appendPages(pages);
    if (failure) {
      setAddError(
        pages.length > 0
          ? `Added ${pages.length} page(s), then stopped at "${failure.fileName}": ${failure.message}`
          : failure.message,
      );
    }
  }

  return (
    <div className="chapter-page" style={{ maxWidth: 640, margin: '1.5rem auto', padding: '0 1rem 6rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{chapter.chapterTitle}</h1>
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => window.print()} title={`Print the ${TAB_LABELS[tab]} tab`}>
            🖨️ Print
          </button>
          <button type="button" onClick={() => downloadChapterFile(chapter)}>
            ⬇️ Save
          </button>
          <button
            type="button"
            onClick={() => {
              clearChapter();
              navigate('/upload');
            }}
          >
            ✖️ Close
          </button>
        </div>
      </header>

      {pageWarnings.length > 0 && (
        <ul className="no-print" style={{ color: 'var(--color-accent)' }}>
          {pageWarnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <nav className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => setTab('translation')}
          style={{ fontWeight: tab === 'translation' ? 700 : 400 }}
        >
          Translation
        </button>
        <button
          type="button"
          onClick={() => setTab('glossary')}
          style={{ fontWeight: tab === 'glossary' ? 700 : 400 }}
        >
          Glossary ({glossary.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('lessonPlan')}
          style={{ fontWeight: tab === 'lessonPlan' ? 700 : 400 }}
        >
          Lesson Plan
        </button>
      </nav>

      <h2 className="print-only">{TAB_LABELS[tab]}</h2>

      {tab === 'translation' && (
        <div>
          {chapter.pages.map((page, pageIndex) => (
            <div key={page.pageId} style={{ marginBottom: '1.5rem' }}>
              {chapter.pages.length > 1 && (
                <h2 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0' }}>
                  Page {pageIndex + 1}
                </h2>
              )}
              {page.translation.map((line, i) => (
                <TranslationLine key={i} line={line} language={chapter.language} />
              ))}
            </div>
          ))}

          <div className="card no-print">
            {addError && <p style={{ color: 'var(--color-danger)', marginTop: 0 }}>{addError}</p>}
            {atPageLimit ? (
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                This chapter has reached the {MAX_PAGES_PER_CHAPTER}-page limit.
              </p>
            ) : (
              <FileDropzone
                label={addProgress ? progressLabel(addProgress) : '📷 Add more pages to this chapter'}
                accept="image/*"
                multiple
                disabled={addProgress !== null}
                onFiles={handleAddPages}
              />
            )}
          </div>
        </div>
      )}
      {tab === 'glossary' && <Glossary entries={glossary} language={chapter.language} />}
      {tab === 'lessonPlan' && (
        <Suspense fallback={<p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}>
          <LessonPlan />
        </Suspense>
      )}

      <button
        type="button"
        className="button-primary no-print"
        onClick={() => setChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          right: '1.25rem',
          borderRadius: '999px',
          padding: '1rem 1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        💬 Ask Dev
      </button>

      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  );
}
