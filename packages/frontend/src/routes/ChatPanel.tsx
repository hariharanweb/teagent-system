import { useState } from 'react';
import { CHAT_MESSAGE_MAX_LENGTH, flattenChapterGlossary, flattenChapterTranslation } from '@teagent/shared';
import { useChapterStore } from '../state/chapterStore';
import { askDev } from '../api/chatApi';
import { ApiError } from '../api/client';
import { ChatBubble } from '../components/ChatBubble';

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const chapter = useChapterStore((s) => s.chapter);
  const chatHistory = useChapterStore((s) => s.chatHistory);
  const appendChatMessage = useChapterStore((s) => s.appendChatMessage);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!chapter) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setError(null);
    setInput('');
    appendChatMessage({ role: 'user', content: message });
    setSending(true);
    try {
      const { reply } = await askDev({
        language: chapter!.language,
        chapterTitle: chapter!.chapterTitle,
        translation: flattenChapterTranslation(chapter!),
        glossary: flattenChapterGlossary(chapter!),
        history: chatHistory,
        message,
      });
      appendChatMessage({ role: 'assistant', content: reply });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dev is having trouble right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Dev"
      className="no-print"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>💬 Dev</h2>
          <button type="button" onClick={onClose}>
            ✖️
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', margin: '0.75rem 0' }}>
          {chatHistory.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)' }}>
              Ask me about a word or line from "{chapter.chapterTitle}"!
            </p>
          )}
          {chatHistory.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
        </div>
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            placeholder="Ask Dev a question…"
            style={{ flex: 1 }}
            disabled={sending}
          />
          <button type="submit" className="button-primary" disabled={sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
