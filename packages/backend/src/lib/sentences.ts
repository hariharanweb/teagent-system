// Splits a section's printed lines into sentences in code, so the translator never has to
// re-type (and possibly "correct") the original text, and each meaning stays aligned to its line.

const SENTENCE_BREAK = /(?<=[^.][।.?!|][”"’')\]]*)\s+/u;
/** A piece this short ("ಸೇತು: ಏ!", "೩.") reads better joined to the sentence after it. */
const MIN_WORDS = 3;

export function splitSentences(printedLines: string[]): string[] {
  const text = printedLines.map((l) => l.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const pieces = text.split(SENTENCE_BREAK).filter(Boolean);
  const sentences: string[] = [];
  let carry = '';
  for (const piece of pieces) {
    const joined = carry ? `${carry} ${piece}` : piece;
    if (joined.split(' ').length < MIN_WORDS) {
      carry = joined;
    } else {
      sentences.push(joined);
      carry = '';
    }
  }
  if (carry) {
    if (sentences.length > 0) sentences[sentences.length - 1] += ` ${carry}`;
    else sentences.push(carry);
  }
  return sentences;
}
