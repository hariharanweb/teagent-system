# Narration uses one TTS clip per line, with estimated word timings

OpenAI's `gpt-4o-mini-tts` returns audio with no word timestamps, but Narration needs per-word highlighting and tap-a-word-to-seek. We synthesize each Translation line as its own clip, so line boundaries are exact, and estimate each word's span within its line from its grapheme count. The clips are decoded in the browser, trimmed, joined with teacher pauses and re-encoded as one constant-bitrate MP3, because simply joining OpenAI's MP3 files breaks seeking.

## Considered Options

- **Azure Speech** has real word-boundary events and good hi-IN/kn-IN female voices, but adds a second cloud vendor and key.
- **Whisper alignment** of a single clip would give real timestamps, but it's unreliable for Kannada and roughly doubles cost and latency.
- **Highlighting the whole line** is always accurate but loses word-level following, which is the point for early readers.
