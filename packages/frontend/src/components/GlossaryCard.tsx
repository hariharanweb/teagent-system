import type { GlossaryEntry, LanguageCode } from '@teagent/shared';
import { HTML_LANG_BY_LANGUAGE } from '../theme/theme';

interface Props {
  entry: GlossaryEntry;
  language: LanguageCode;
}

export function GlossaryCard({ entry, language }: Props) {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <p lang={HTML_LANG_BY_LANGUAGE[language]} style={{ fontSize: '1.3rem', margin: '0 0 0.35rem 0', fontWeight: 600 }}>
        {entry.word}
      </p>
      <p style={{ margin: '0 0 0.35rem 0' }}>{entry.meaning}</p>
      {entry.synonyms.length > 0 && (
        <p
          lang={HTML_LANG_BY_LANGUAGE[language]}
          style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}
        >
          also like: {entry.synonyms.join(', ')}
        </p>
      )}
    </div>
  );
}
