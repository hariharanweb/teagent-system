import { useCallback, useEffect, useRef, useState } from 'react';
import { cueAt, type WordCue } from '../lib/narration/assemble';

export const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

export interface ActiveWord {
  pageId: string;
  lineIndex: number;
  wordIndex: number;
}

export interface NarrationPlayer {
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  active: ActiveWord | null;
  toggle: () => void;
  seek: (seconds: number) => void;
  seekToWord: (pageId: string, lineIndex: number, wordIndex: number) => void;
  cycleRate: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

/** Drives one <audio> element over the assembled Narration and tracks the word being spoken. */
export function useNarrationPlayer(src: string | null, cues: WordCue[]): NarrationPlayer {
  const [audio] = useState(() => (typeof Audio === 'undefined' ? null : new Audio()));
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [active, setActive] = useState<ActiveWord | null>(null);
  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  const syncActive = useCallback(() => {
    if (!audio) return;
    const cue = cueAt(cuesRef.current, audio.currentTime);
    setActive((prev) =>
      prev?.pageId === cue?.pageId && prev?.lineIndex === cue?.lineIndex && prev?.wordIndex === cue?.wordIndex
        ? prev
        : cue && { pageId: cue.pageId, lineIndex: cue.lineIndex, wordIndex: cue.wordIndex },
    );
    setCurrentTime(audio.currentTime);
  }, [audio]);

  // Swap in a new src (e.g. after more pages are narrated) without losing the listening position.
  useEffect(() => {
    if (!audio) return;
    const resumeAt = audio.currentTime;
    const wasPlaying = !audio.paused;
    if (!src) {
      audio.pause();
      audio.removeAttribute('src');
      setDuration(0);
      setActive(null);
      return;
    }
    audio.src = src;
    audio.playbackRate = rate;
    const onLoaded = () => {
      setDuration(audio.duration);
      if (resumeAt > 0) audio.currentTime = Math.min(resumeAt, audio.duration);
      if (wasPlaying) void audio.play();
    };
    audio.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rate is applied separately; only src swaps reload
  }, [audio, src]);

  useEffect(() => {
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    audio.addEventListener('seeked', syncActive);
    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
      audio.removeEventListener('seeked', syncActive);
    };
  }, [audio, syncActive]);

  // timeupdate fires only ~4×/s — too coarse for word highlighting — so poll per frame while playing.
  useEffect(() => {
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      syncActive();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, syncActive]);

  const toggle = useCallback(() => {
    if (!audio || !src) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [audio, src]);

  const seek = useCallback(
    (seconds: number) => {
      if (!audio || !src) return;
      audio.currentTime = seconds;
      syncActive();
    },
    [audio, src, syncActive],
  );

  const seekToWord = useCallback(
    (pageId: string, lineIndex: number, wordIndex: number) => {
      const cue = cuesRef.current.find(
        (c) => c.pageId === pageId && c.lineIndex === lineIndex && c.wordIndex === wordIndex,
      );
      if (!audio || !cue) return;
      audio.currentTime = cue.start;
      syncActive();
      void audio.play();
    },
    [audio, syncActive],
  );

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(prev as (typeof PLAYBACK_RATES)[number]) + 1) % PLAYBACK_RATES.length]!;
      if (audio) audio.playbackRate = next;
      return next;
    });
  }, [audio]);

  // Space pauses/plays anywhere except while typing (e.g. in the chat box).
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, toggle]);

  return { ready: !!src, playing, currentTime, duration, rate, active, toggle, seek, seekToWord, cycleRate };
}
