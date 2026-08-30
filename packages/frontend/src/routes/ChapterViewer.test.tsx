import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChapterFile } from '@teagent/shared';
import { useChapterStore } from '../state/chapterStore';
import { ChapterViewer } from './ChapterViewer';

vi.mock('../api/lessonPlanApi', () => ({
  fetchLessonPlan: vi.fn().mockResolvedValue({ lessonPlan: 'Read the chapter aloud.' }),
}));

const chapter: ChapterFile = {
  formatVersion: 2,
  language: 'hin',
  chapterTitle: 'Chapter 3',
  createdAt: '2026-01-01T00:00:00.000Z',
  pages: [
    {
      pageId: '11111111-1111-4111-8111-111111111111',
      translation: [{ meaning: 'did not take', wordByWordMeaning: 'From not took', hin: 'से नहीं लिया' }],
      glossary: [{ word: 'समय', language: 'hin', meaning: 'time', synonyms: [] }],
      warnings: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

function renderViewer() {
  useChapterStore.setState({ chapter, chatHistory: [] });
  return render(
    <MemoryRouter>
      <ChapterViewer />
    </MemoryRouter>,
  );
}

describe('ChapterViewer print', () => {
  beforeEach(() => {
    vi.stubGlobal('print', vi.fn());
  });

  it('offers a Print button on every tab', async () => {
    renderViewer();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /glossary/i }));
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /lesson plan/i }));
    expect(await screen.findByText('Read the chapter aloud.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  it('prints via the browser and keeps chrome (tabs, chat, save/close) off the page', () => {
    const { container } = renderViewer();

    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(window.print).toHaveBeenCalledOnce();

    // The translation itself must not be inside a .no-print subtree.
    const line = screen.getByText('से नहीं लिया');
    expect(line.closest('.no-print')).toBeNull();

    for (const name of [/save/i, /close/i, /ask dev/i, /^translation$/i]) {
      expect(screen.getByRole('button', { name }).closest('.no-print')).not.toBeNull();
    }
    expect(container.querySelector('nav')).toHaveClass('no-print');
  });
});
