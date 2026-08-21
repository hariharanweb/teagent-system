import { useEffect, useState } from 'react';
import { flattenChapterGlossary, flattenChapterTranslation } from '@teagent/shared';
import { useChapterStore } from '../state/chapterStore';
import { fetchLessonPlan } from '../api/lessonPlanApi';
import { ApiError } from '../api/client';
import { Markdown } from '../components/Markdown';

export function LessonPlan() {
  const chapter = useChapterStore((s) => s.chapter);
  const setLessonPlan = useChapterStore((s) => s.setLessonPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapter || chapter.lessonPlan || loading) return;
    setLoading(true);
    setError(null);
    fetchLessonPlan({
      language: chapter.language,
      chapterTitle: chapter.chapterTitle,
      translation: flattenChapterTranslation(chapter),
      glossary: flattenChapterGlossary(chapter),
    })
      .then((res) => setLessonPlan(res.lessonPlan))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not build the lesson plan right now.'),
      )
      .finally(() => setLoading(false));
    // Re-run only when the chapter identity/content actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.chapterTitle, chapter?.pages.length, chapter?.lessonPlan]);

  if (!chapter) return null;

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Building your lesson plan…</p>;
  }
  if (error) {
    return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  }
  if (!chapter.lessonPlan) return null;

  return <Markdown content={chapter.lessonPlan} />;
}
