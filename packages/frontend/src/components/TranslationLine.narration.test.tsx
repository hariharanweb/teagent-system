import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TranslationLine } from './TranslationLine';

const line = { meaning: 'I start the day', wordByWordMeaning: 'I day of start do', hin: 'मैं दिन की शुरूआत करती हूँ।' };

describe('TranslationLine with narration', () => {
  it('highlights the active word and plays from a tapped word', () => {
    const onWordClick = vi.fn();
    const { container } = render(
      <TranslationLine line={line} language="hin" pageId="p1" lineIndex={4} activeWordIndex={1} onWordClick={onWordClick} />,
    );

    const words = container.querySelectorAll('[data-word-index]');
    expect(Array.from(words, (w) => w.textContent)).toEqual(['मैं', 'दिन', 'की', 'शुरूआत', 'करती', 'हूँ']);
    expect((words[1] as HTMLElement).style.background).toContain('--color-highlight');
    expect((words[0] as HTMLElement).style.background).toBe('');

    fireEvent.click(words[3]!);
    expect(onWordClick).toHaveBeenCalledWith('p1', 4, 3);
  });

  it('keeps the original text intact, punctuation included', () => {
    const { container } = render(<TranslationLine line={line} language="hin" pageId="p1" lineIndex={0} onWordClick={() => {}} />);
    expect(container.querySelector('p[lang="hi"]')!.textContent).toBe(line.hin);
  });
});
