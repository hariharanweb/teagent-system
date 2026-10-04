import { describe, expect, it } from 'vitest';
import { readNarrationTag, writeNarrationTag } from './id3';

describe('narration ID3 tag', () => {
  it('round-trips JSON (including non-ASCII) and finds where the audio starts', () => {
    const audio = Uint8Array.of(0xff, 0xf3, 1, 2, 3);
    const json = JSON.stringify({ title: 'अच्छा कौन', n: 1 });

    const file = writeNarrationTag(audio, json);
    const { json: read, audioStart } = readNarrationTag(file);

    expect(JSON.parse(read!)).toEqual({ title: 'अच्छा कौन', n: 1 });
    expect(Array.from(file.subarray(audioStart))).toEqual(Array.from(audio));
  });

  it('reports no tag for a plain MP3', () => {
    expect(readNarrationTag(Uint8Array.of(0xff, 0xf3, 1, 2))).toEqual({ json: null, audioStart: 0 });
  });
});
