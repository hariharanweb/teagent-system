import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login } from '../api/authApi';
import { ApiError } from '../api/client';
import { useAuthStore } from '../state/authStore';

export function Login() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState(searchParams.get('username') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const storeLogin = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token, profile } = await login({ username, password });
      storeLogin(token, profile);
      navigate('/upload');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ textAlign: 'center' }}>👋 Hi there!</h1>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            style={{ width: '100%', marginTop: '0.35rem' }}
          />
        </label>
        <label>
          Password / PIN
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginTop: '0.35rem' }}
          />
        </label>
        {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Let’s go!'}
        </button>
      </form>
    </div>
  );
}
