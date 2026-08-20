import type { LanguageCode } from '@teagent/shared';

/** BCP-47 lang attribute, so CSS :lang()/[lang] selectors pick the right script font. */
export const HTML_LANG_BY_LANGUAGE: Record<LanguageCode, string> = {
  hin: 'hi',
  kan: 'kn',
};

export const AVATAR_EMOJI: Record<string, string> = {
  panda: '🐼',
  tiger: '🐯',
  fox: '🦊',
  owl: '🦉',
  koala: '🐨',
  lion: '🦁',
};

export function avatarEmoji(avatarKey: string): string {
  return AVATAR_EMOJI[avatarKey] ?? '🙂';
}
