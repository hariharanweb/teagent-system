import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProfileSummary } from '@teagent/shared';

interface AuthState {
  token: string | null;
  profile: ProfileSummary | null;
  login: (token: string, profile: ProfileSummary) => void;
  logout: () => void;
}

// sessionStorage (not localStorage) — this is a shared-device kid app, so we deliberately keep
// the session footprint small rather than persisting login across browser restarts by default.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      login: (token, profile) => set({ token, profile }),
      logout: () => set({ token: null, profile: null }),
    }),
    {
      name: 'teagent-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
