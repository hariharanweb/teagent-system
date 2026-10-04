import type { ChapterPage, LanguageCode, NarrationLineTiming } from '@teagent/shared';
import { narrateLines } from '../../api/narrationApi';
import { HTML_LANG_BY_LANGUAGE } from '../../theme/theme';
import { decodeClip, encodeMp3, ENCODER_DELAY_S, SAMPLE_RATE, trimSilence } from './audio';
import { pageFingerprint } from './fingerprint';
import { estimateWordTimings } from './wordTimings';
import { spokenWords } from './words';

/** One page's spoken audio plus its Word timings (seconds from the start of this page). */
export interface PageNarration {
  pageId: string;
  fingerprint: string;
  mp3: Uint8Array;
  lines: NarrationLineTiming[];
}

const LINE_PAUSE_S = 0.4;
const SECTION_PAUSE_S = 0.9;
const PAGE_END_PAUSE_S = 1.2;

export function pageLineTexts(page: ChapterPage, language: LanguageCode): string[] {
  return page.translation.map((line) => (line as Record<string, string>)[language] ?? '');
}

/** Teacher pacing: a short breath between lines, a longer one where a new section starts. */
export function pausesAfterLines(page: ChapterPage): number[] {
  return page.translation.map((line, i) => {
    const next = page.translation[i + 1];
    if (!next) return PAGE_END_PAUSE_S;
    return next.section !== line.section ? SECTION_PAUSE_S : LINE_PAUSE_S;
  });
}

/** Places clips back to back with pauses; returns each clip's [start, end] in seconds. */
export function layoutLines(clipSampleCounts: number[], pausesS: number[]): { spans: { start: number; end: number }[]; totalSamples: number } {
  let cursor = 0;
  const spans = clipSampleCounts.map((count, i) => {
    const start = cursor;
    cursor += count;
    const span = { start: start / SAMPLE_RATE, end: cursor / SAMPLE_RATE };
    cursor += Math.round((pausesS[i] ?? 0) * SAMPLE_RATE);
    return span;
  });
  return { spans, totalSamples: cursor };
}

export async function narratePage(page: ChapterPage, language: LanguageCode): Promise<PageNarration> {
  const texts = pageLineTexts(page, language);
  const { clips } = await narrateLines({ language, lines: texts });

  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const decoded = await Promise.all(clips.map(async (clip) => trimSilence(await decodeClip(clip, ctx))));

  const { spans, totalSamples } = layoutLines(
    decoded.map((d) => d.length),
    pausesAfterLines(page),
  );
  const pcm = new Float32Array(totalSamples);
  decoded.forEach((clip, i) => pcm.set(clip, Math.round(spans[i]!.start * SAMPLE_RATE)));

  const htmlLang = HTML_LANG_BY_LANGUAGE[language];
  const lines = spans.map((span, i) => {
    const start = span.start + ENCODER_DELAY_S;
    const end = span.end + ENCODER_DELAY_S;
    return {
      start: Math.round(start * 1000) / 1000,
      end: Math.round(end * 1000) / 1000,
      words: estimateWordTimings(start, end, spokenWords(texts[i]!, htmlLang)),
    };
  });

  return {
    pageId: page.pageId,
    fingerprint: await pageFingerprint(language, texts),
    mp3: await encodeMp3(pcm),
    lines,
  };
}
