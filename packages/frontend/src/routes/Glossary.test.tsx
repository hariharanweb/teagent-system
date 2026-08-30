import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GlossaryEntry } from '@teagent/shared';
import { Glossary } from './Glossary';

const entries: GlossaryEntry[] = [
  { word: 'समय', language: 'hin', meaning: 'time', synonyms: [] },
  { word: 'नदी', language: 'hin', meaning: 'river', synonyms: [] },
];

describe('Glossary', () => {
  it('hides non-matching words from the screen but keeps them in the document so Print gets the whole list', () => {
    render(<Glossary entries={entries} language="hin" />);

    fireEvent.change(screen.getByPlaceholderText('Search words…'), { target: { value: 'नदी' } });

    // Still mounted (print reveals it via .screen-hidden), but not visible on screen.
    const hidden = screen.getByText('समय');
    expect(hidden).toBeInTheDocument();
    expect(hidden.closest('.screen-hidden')).not.toBeNull();

    expect(screen.getByText('नदी').closest('.screen-hidden')).toBeNull();
  });

  it('tells the user when a search matches nothing', () => {
    render(<Glossary entries={entries} language="hin" />);

    fireEvent.change(screen.getByPlaceholderText('Search words…'), { target: { value: 'zzz' } });

    expect(screen.getByText(/No words match/)).toBeInTheDocument();
  });
});
