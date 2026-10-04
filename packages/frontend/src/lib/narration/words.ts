/** A piece of a line's original text; only spoken words get a `wordIndex` (spaces/punctuation don't). */
export interface TextSegment {
  text: string;
  wordIndex: number | null;
}

/**
 * Splits text into word and non-word segments. This is the single definition of "word" shared
 * by Word timing estimation and the clickable word spans, so their indexes always line up.
 */
export function segmentWords(text: string, htmlLang: string): TextSegment[] {
  const segmenter = new Intl.Segmenter(htmlLang, { granularity: 'word' });
  let next = 0;
  return Array.from(segmenter.segment(text), (s) => ({
    text: s.segment,
    wordIndex: s.isWordLike ? next++ : null,
  }));
}

export function spokenWords(text: string, htmlLang: string): string[] {
  return segmentWords(text, htmlLang)
    .filter((s) => s.wordIndex !== null)
    .map((s) => s.text);
}

/** Counts user-perceived characters, so a conjunct or a letter+matra counts once. */
export function graphemeCount(text: string): number {
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)).length;
}
