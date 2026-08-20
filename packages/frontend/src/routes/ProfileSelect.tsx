import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProfileSummary } from '@teagent/shared';
import { fetchFamilyProfiles } from '../api/authApi';
import { useAuthStore } from '../state/authStore';
import { avatarEmoji } from '../theme/theme';

export function ProfileSelect() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const currentProfile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFamilyProfiles()
      .then((res) => setProfiles(res.profiles))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', marginTop: '3rem' }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: '3rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1>Who's learning today?</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
          gap: '1rem',
          margin: '2rem 0',
        }}
      >
        {profiles.map((profile) => (
          <button
            key={profile.profileId}
            type="button"
            className="card"
            onClick={() => {
              if (profile.profileId === currentProfile?.profileId) {
                navigate('/upload');
              } else {
                logout();
                navigate('/login');
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1.25rem 0.5rem',
              border:
                profile.profileId === currentProfile?.profileId
                  ? '2px solid var(--color-primary)'
                  : undefined,
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{avatarEmoji(profile.avatarKey)}</span>
            <span>{profile.displayName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
