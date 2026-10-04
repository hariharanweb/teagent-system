import { memo, useEffect, useRef } from 'react';
import type { LanguageCode, AnyTranslationLine as TranslationLineType } from '@teagent/shared';
import { HTML_LANG_BY_LANGUAGE } from '../theme/theme';
import { segmentWords } from '../lib/narration/words';

interface Props {
  line: TranslationLineType;
  language: LanguageCode;
  pageId?: string;
  lineIndex?: number;
  /** Index of the word currently being spoken in this line, if any. */
  activeWordIndex?: number;
  /** Set once narration audio exists: tapping a word plays from it. */
  onWordClick?: (pageId: string, lineIndex: number, wordIndex: number) => void;
}

export const TranslationLine = memo(function TranslationLine({
  line,
  language,
  pageId,
  lineIndex,
  activeWordIndex,
  onWordClick,
}: Props) {
  const originalText = (line as Record<string, string>)[language] ?? '';
  const htmlLang = HTML_LANG_BY_LANGUAGE[language];
  const cardRef = useRef<HTMLDivElement>(null);
  const isActiveLine = activeWordIndex !== undefined;
  const clickable = !!onWordClick && pageId !== undefined && lineIndex !== undefined;

  // Keep the line being read on screen as narration moves down the page.
  useEffect(() => {
    if (isActiveLine) cardRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [isActiveLine]);

  return (
    <div ref={cardRef} className="card" style={{ marginBottom: '0.75rem' }}>
      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
        {line.wordByWordMeaning}
      </p>
      <p lang={htmlLang} style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
        {clickable || isActiveLine
          ? segmentWords(originalText, htmlLang).map((segment, i) =>
              segment.wordIndex === null ? (
                segment.text
              ) : (
                <span
                  key={i}
                  data-word-index={segment.wordIndex}
                  onClick={clickable ? () => onWordClick(pageId, lineIndex, segment.wordIndex!) : undefined}
                  style={{
                    cursor: clickable ? 'pointer' : undefined,
                    borderRadius: '6px',
                    transition: 'background-color 80ms',
                    background: segment.wordIndex === activeWordIndex ? 'var(--color-highlight)' : undefined,
                  }}
                >
                  {segment.text}
                </span>
              ),
            )
          : originalText}
      </p>
      <p style={{ margin: 0, color: 'var(--color-text)' }}>{line.meaning}</p>
    </div>
  );
});
