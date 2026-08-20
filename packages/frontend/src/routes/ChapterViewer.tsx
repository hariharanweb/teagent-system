import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useChapterStore } from '../state/chapterStore';
import { TranslationLine } from '../components/TranslationLine';
import { downloadChapterFile } from '../lib/fileIO';
import { ChatPanel } from './ChatPanel';
import { Glossary } from './Glossary';

type Tab = 'translation' | 'glossary';

export function ChapterViewer() {
  const chapter = useChapterStore((s) => s.chapter);
  const clearChapter = useChapterStore((s) => s.clearChapter);
  const [tab, setTab] = useState<Tab>('translation');
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  if (!chapter) return <Navigate to="/upload" replace />;

  return (
    <div style={{ maxWidth: 640, margin: '1.5rem auto', padding: '0 1rem 6rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{chapter.chapterTitle}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      {chapter.warnings.length > 0 && (
        <ul style={{ color: 'var(--color-accent)' }}>
          {chapter.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
          Glossary ({chapter.glossary.length})
        </button>
      </nav>

      {tab === 'translation' ? (
        <div>
          {chapter.translation.map((line, i) => (
            <TranslationLine key={i} line={line} language={chapter.language} />
          ))}
        </div>
      ) : (
        <Glossary entries={chapter.glossary} language={chapter.language} />
      )}

      <button
        type="button"
        className="button-primary"
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
