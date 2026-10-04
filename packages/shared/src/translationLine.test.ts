import { describe, expect, it } from 'vitest';
import {
  flattenTranslationSections,
  translationLinesSchema,
  translationSectionsSchema,
} from './translationLine.schema.js';

describe('translationLinesSchema', () => {
  it('accepts the exact user-specified Hindi output shape', () => {
    const input = [
      {
        meaning: 'did not take',
        wordByWordMeaning: 'From not took',
        hin: 'से नहीं लिया',
      },
      {
        meaning: 'Time kept on passing by',
        wordByWordMeaning: 'Time passed kept on',
        hin: 'समय बीतता रहा',
      },
    ];
    expect(translationLinesSchema('hin').parse(input)).toEqual(input);
  });

  it('rejects a line missing the language field', () => {
    const input = [{ meaning: 'x', wordByWordMeaning: 'y' }];
    expect(() => translationLinesSchema('hin').parse(input)).toThrow();
  });
});

describe('translationSectionsSchema + flattenTranslationSections', () => {
  it('flattens sections in order, heading first, tagging every line with its section', () => {
    const sections = translationSectionsSchema('hin').parse([
      {
        section: 'Discussion on the lesson',
        heading: { meaning: 'Discussion on the lesson', wordByWordMeaning: 'Lesson on discussion', hin: 'पाठ पर चर्चा' },
        lines: [{ meaning: 'Ask the children', wordByWordMeaning: 'Children from ask', hin: 'बच्चों से पूछें' }],
      },
      {
        section: 'Story',
        heading: null,
        lines: [{ meaning: 'There were four friends', wordByWordMeaning: 'Four friends were', hin: 'चार सहेलियाँ थीं' }],
      },
    ]);

    const lines = flattenTranslationSections(sections);

    expect(lines.map((l) => [l.section, l.hin])).toEqual([
      ['Discussion on the lesson', 'पाठ पर चर्चा'],
      ['Discussion on the lesson', 'बच्चों से पूछें'],
      ['Story', 'चार सहेलियाँ थीं'],
    ]);
  });

  it('still accepts lines without a section (files saved before sections existed)', () => {
    const input = [{ meaning: 'x', wordByWordMeaning: 'y', hin: 'z' }];
    expect(translationLinesSchema('hin').parse(input)).toEqual(input);
  });
});
