import type { LanguageCode } from '@teagent/shared';

/** Page fingerprint: identifies the exact text a Page narration was spoken from. */
export async function pageFingerprint(language: LanguageCode, lines: string[]): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify([language, lines]));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
