import { useState } from 'react';
import type { GlossaryEntry, LanguageCode } from '@teagent/shared';
import { GlossaryCard } from '../components/GlossaryCard';

interface Props {
  entries: GlossaryEntry[];
  language: LanguageCode;
}

export function Glossary({ entries, language }: Props) {
  const [query, setQuery] = useState('');
  const filtered = entries.filter(
    (e) =>
      e.word.includes(query) ||
      e.meaning.toLowerCase().includes(query.toLowerCase()) ||
      e.synonyms.some((s) => s.includes(query)),
  );

  if (entries.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>No tricky words found in this chapter yet!</p>;
  }

  return (
    <div>
      <input
        placeholder="Search words…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      {filtered.map((entry) => (
        <GlossaryCard key={entry.word} entry={entry} language={language} />
      ))}
    </div>
  );
}
