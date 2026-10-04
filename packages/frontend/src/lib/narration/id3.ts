// Minimal ID3v2.3 support for one TXXX (user-defined text) frame — enough to carry the
// Narration's word timings inside the MP3 while it still plays in any ordinary player.

const DESCRIPTION = 'teagent-narration';
const HEADER_SIZE = 10;
const FRAME_HEADER_SIZE = 10;

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (c) => c.charCodeAt(0));
}

function syncsafe(n: number): Uint8Array {
  return Uint8Array.of((n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f);
}

function readSyncsafe(b: Uint8Array, at: number): number {
  return ((b[at]! & 0x7f) << 21) | ((b[at + 1]! & 0x7f) << 14) | ((b[at + 2]! & 0x7f) << 7) | (b[at + 3]! & 0x7f);
}

function readUint32(b: Uint8Array, at: number): number {
  return ((b[at]! << 24) >>> 0) + (b[at + 1]! << 16) + (b[at + 2]! << 8) + b[at + 3]!;
}

/** Prepends an ID3 tag holding `json` (escaped to pure ASCII, so Latin-1 encoding is lossless). */
export function writeNarrationTag(audio: Uint8Array, json: string): Uint8Array {
  const asciiJson = json.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const body = concat(Uint8Array.of(0), ascii(DESCRIPTION), Uint8Array.of(0), ascii(asciiJson));
  const size = body.length;
  const frameHeader = concat(ascii('TXXX'), Uint8Array.of(size >>> 24, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff, 0, 0));
  const frame = concat(frameHeader, body);
  const header = concat(ascii('ID3'), Uint8Array.of(3, 0, 0), syncsafe(frame.length));
  return concat(header, frame, audio);
}

/** Finds our TXXX frame, if any, and where the audio starts after the tag. */
export function readNarrationTag(bytes: Uint8Array): { json: string | null; audioStart: number } {
  if (bytes.length < HEADER_SIZE || String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!) !== 'ID3') {
    return { json: null, audioStart: 0 };
  }
  const version = bytes[3]!;
  const tagEnd = HEADER_SIZE + readSyncsafe(bytes, 6);

  let pos = HEADER_SIZE;
  while (pos + FRAME_HEADER_SIZE <= tagEnd) {
    const id = String.fromCharCode(bytes[pos]!, bytes[pos + 1]!, bytes[pos + 2]!, bytes[pos + 3]!);
    if (bytes[pos] === 0) break; // padding
    const frameSize = version >= 4 ? readSyncsafe(bytes, pos + 4) : readUint32(bytes, pos + 4);
    const body = bytes.subarray(pos + FRAME_HEADER_SIZE, pos + FRAME_HEADER_SIZE + frameSize);
    if (id === 'TXXX' && body[0] === 0) {
      const descEnd = body.indexOf(0, 1);
      if (descEnd > 0 && String.fromCharCode(...body.subarray(1, descEnd)) === DESCRIPTION) {
        return { json: new TextDecoder('latin1').decode(body.subarray(descEnd + 1)), audioStart: tagEnd };
      }
    }
    pos += FRAME_HEADER_SIZE + frameSize;
  }
  return { json: null, audioStart: tagEnd };
}
