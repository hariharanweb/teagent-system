import type { ChatMessage } from '@teagent/shared';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
      <div
        style={{
          maxWidth: '80%',
          padding: '0.6rem 0.9rem',
          borderRadius: 'var(--radius-md)',
          background: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
          color: isUser ? 'var(--color-primary-contrast)' : 'var(--color-text)',
          border: isUser ? 'none' : '1px solid var(--color-border)',
        }}
      >
        {!isUser && <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.15rem' }}>Dev</strong>}
        <span>{message.content}</span>
      </div>
    </div>
  );
}
