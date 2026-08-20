import type { LanguageCode, AnyTranslationLine as TranslationLineType } from '@teagent/shared';
import { HTML_LANG_BY_LANGUAGE } from '../theme/theme';

interface Props {
  line: TranslationLineType;
  language: LanguageCode;
}

export function TranslationLine({ line, language }: Props) {
  const originalText = (line as Record<string, string>)[language] ?? '';

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
        {line.wordByWordMeaning}
      </p>
      <p
        lang={HTML_LANG_BY_LANGUAGE[language]}
        style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}
      >
        {originalText}
      </p>
      <p style={{ margin: 0, color: 'var(--color-text)' }}>{line.meaning}</p>
    </div>
  );
}
