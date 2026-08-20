import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranslationLine } from './TranslationLine';

describe('TranslationLine', () => {
  it('renders word-by-word, then original text, then meaning, in that order, with no label or index', () => {
    const { container } = render(
      <TranslationLine
        language="hin"
        line={{ meaning: 'did not take', wordByWordMeaning: 'From not took', hin: 'से नहीं लिया' }}
      />,
    );

    expect(screen.queryByText(/word-by-word/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^1\./)).not.toBeInTheDocument();

    const paragraphs = Array.from(container.querySelectorAll('p')).map((p) => p.textContent);
    expect(paragraphs).toEqual(['From not took', 'से नहीं लिया', 'did not take']);
  });
});
