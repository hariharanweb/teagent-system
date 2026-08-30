import { useState } from 'react';
import type { GlossaryEntry, LanguageCode } from '@teagent/shared';
import { GlossaryCard } from '../components/GlossaryCard';

interface Props {
  entries: GlossaryEntry[];
  language: LanguageCode;
}

function matchesQuery(entry: GlossaryEntry, query: string): boolean {
  if (query === '') return true;
  return (
    entry.word.includes(query) ||
    entry.meaning.toLowerCase().includes(query.toLowerCase()) ||
    entry.synonyms.some((s) => s.includes(query))
  );
}

export function Glossary({ entries, language }: Props) {
  const [query, setQuery] = useState('');
  const matchCount = entries.filter((e) => matchesQuery(e, query)).length;

  if (entries.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>No tricky words found in this chapter yet!</p>;
  }

  return (
    <div>
      <input
        className="no-print"
        placeholder="Search words…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      {matchCount === 0 && (
        <p className="no-print" style={{ color: 'var(--color-text-muted)' }}>
          No words match “{query}”.
        </p>
      )}
      {/* Every entry stays mounted and non-matching ones are hidden with CSS rather than filtered
          out of the list, so Print emits the whole glossary even while a search is narrowing the
          screen down to a few words. */}
      {entries.map((entry) => (
        <div key={entry.word} className={matchesQuery(entry, query) ? undefined : 'screen-hidden'}>
          <GlossaryCard entry={entry} language={language} />
        </div>
      ))}
    </div>
  );
}
