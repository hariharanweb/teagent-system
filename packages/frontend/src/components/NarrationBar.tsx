import { useRef, useState } from 'react';
import type { ChapterFile } from '@teagent/shared';
import { ApiError } from '../api/client';
import { PLAYBACK_RATES, type NarrationPlayer } from '../hooks/useNarrationPlayer';
import { chapterFileStem, downloadBlob } from '../lib/fileIO';
import { narratePage } from '../lib/narration/pageNarration';
import { NarrationFileError, restoreNarration } from '../lib/narration/reopen';
import { useNarrationStore } from '../state/narrationStore';

interface Props {
  chapter: ChapterFile;
  player: NarrationPlayer;
  /** The joined Narration file for download, or null before any page is narrated. */
  file: Uint8Array | null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.statusCode === 429) return "Today's listening limit is used up — try again tomorrow.";
  return err instanceof Error ? err.message : 'Something went wrong';
}

export function NarrationBar({ chapter, player, file }: Props) {
  const pages = useNarrationStore((s) => s.pages);
  const progress = useNarrationStore((s) => s.progress);
  const message = useNarrationStore((s) => s.message);
  const { addPages, setProgress, setMessage } = useNarrationStore.getState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [opening, setOpening] = useState(false);

  const missing = chapter.pages.filter((p) => !pages[p.pageId]);
  const busy = progress !== null || opening;
  const hasAudio = player.ready;

  async function narrateMissing() {
    setMessage(null);
    for (const [i, page] of missing.entries()) {
      setProgress({ current: i + 1, total: missing.length });
      try {
        addPages([await narratePage(page, chapter.language)]);
      } catch (err) {
        const pageNumber = chapter.pages.indexOf(page) + 1;
        setMessage(`Couldn't narrate page ${pageNumber}: ${errorMessage(err)}`);
        break;
      }
    }
    setProgress(null);
  }

  async function openFile(selected: File) {
    setOpening(true);
    setMessage(null);
    try {
      const { restored, skipped } = await restoreNarration(new Uint8Array(await selected.arrayBuffer()), chapter);
      addPages(restored);
      if (restored.length === 0) setMessage('None of the pages in this MP3 match this chapter.');
      else if (skipped > 0) setMessage(`Restored ${restored.length} page(s); ${skipped} page(s) didn't match and need narrating again.`);
    } catch (err) {
      setMessage(err instanceof NarrationFileError ? err.message : 'Could not open this file.');
    } finally {
      setOpening(false);
    }
  }

  const narrateLabel =
    missing.length === chapter.pages.length ? '🔊 Listen' : `🔊 Narrate ${missing.length} new page${missing.length > 1 ? 's' : ''}`;

  return (
    <div
      className="no-print"
      role="region"
      aria-label="Narration"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
        padding: '0.6rem 1rem',
        zIndex: 10,
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        {hasAudio && (
          <>
            <button
              type="button"
              className="button-primary"
              onClick={player.toggle}
              aria-label={player.playing ? 'Pause' : 'Play'}
              style={{ borderRadius: '999px', minWidth: 56, minHeight: 56, fontSize: '1.4rem' }}
            >
              {player.playing ? '⏸' : '▶'}
            </button>
            <button type="button" onClick={player.cycleRate} title={`Speed: ${PLAYBACK_RATES.join(' / ')}`}>
              {player.rate}×
            </button>
            <input
              type="range"
              aria-label="Position"
              min={0}
              max={player.duration || 0}
              step={0.1}
              value={player.currentTime}
              onChange={(e) => player.seek(Number(e.target.value))}
              style={{ flex: '1 1 120px' }}
            />
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {formatTime(player.currentTime)} / {formatTime(player.duration)}
            </span>
            {file && (
              <button
                type="button"
                onClick={() => downloadBlob(new Blob([file as BlobPart], { type: 'audio/mpeg' }), `${chapterFileStem(chapter)}.mp3`)}
              >
                ⬇️ MP3
              </button>
            )}
          </>
        )}

        {progress ? (
          <span style={{ color: 'var(--color-text-muted)' }}>
            Narrating page {progress.current} of {progress.total}…
          </span>
        ) : (
          missing.length > 0 && (
            <button type="button" className={hasAudio ? undefined : 'button-primary'} disabled={busy} onClick={narrateMissing}>
              {narrateLabel}
            </button>
          )
        )}

        {!hasAudio && (
          <>
            <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              📂 Open MP3
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3"
              style={{ display: 'none' }}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                e.target.value = '';
                if (selected) void openFile(selected);
              }}
            />
          </>
        )}
      </div>
      {message && (
        <p style={{ maxWidth: 640, margin: '0.4rem auto 0', color: 'var(--color-danger)', fontSize: '0.9rem' }}>{message}</p>
      )}
    </div>
  );
}
