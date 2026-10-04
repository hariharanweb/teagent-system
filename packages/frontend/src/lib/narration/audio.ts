// Browser audio plumbing for Narration. OpenAI's per-line MP3 clips can't simply be joined —
// each carries its own length header, which breaks seeking — so they're decoded to PCM,
// trimmed, joined with teacher pauses, and re-encoded as one constant-bitrate MP3.

export const SAMPLE_RATE = 24_000;
const MP3_KBPS = 64;
/** Constant bitrate, so a byte count converts exactly to playback seconds. */
export const MP3_BYTES_PER_SECOND = (MP3_KBPS * 1000) / 8;
/** LAME's fixed start-up delay: decoded audio begins this much later than the PCM we fed in. */
export const ENCODER_DELAY_S = 0.048;

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Decodes a base64 MP3 clip to mono PCM at SAMPLE_RATE (the context resamples). */
export async function decodeClip(base64: string, ctx: BaseAudioContext): Promise<Float32Array> {
  const bytes = base64ToBytes(base64);
  const buffer = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
  return buffer.getChannelData(0);
}

/** Drops leading/trailing near-silence (keeping a small margin) so line edges match speech. */
export function trimSilence(samples: Float32Array, threshold = 0.01, marginS = 0.03): Float32Array {
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]!) < threshold) first++;
  if (first === samples.length) return samples.subarray(0, 0);
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]!) < threshold) last--;
  const margin = Math.round(marginS * SAMPLE_RATE);
  return samples.subarray(Math.max(0, first - margin), Math.min(samples.length, last + 1 + margin));
}

export async function encodeMp3(samples: Float32Array): Promise<Uint8Array> {
  // ~100 KB encoder, only needed once someone asks for audio.
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, MP3_KBPS);
  const pcm = Int16Array.from(samples, (s) => Math.max(-1, Math.min(1, s)) * 0x7fff);

  const chunks: Uint8Array[] = [];
  const BLOCK = 1152 * 16;
  for (let i = 0; i < pcm.length; i += BLOCK) {
    chunks.push(encoder.encodeBuffer(pcm.subarray(i, i + BLOCK)));
  }
  chunks.push(encoder.flush());

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
