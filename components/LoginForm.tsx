'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; hint?: string };
      if (!json.ok) {
        setError(json.hint ? `${json.error} ${json.hint}` : (json.error ?? 'Could not sign in.'));
        setBusy(false);
        return;
      }
      router.replace(next.startsWith('/') ? next : '/');
      router.refresh();
    } catch {
      setError('Could not reach the desk. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel">
      <h1 style={{ marginBottom: 6 }}>Sign in</h1>
      <p className="lede" style={{ marginBottom: 20 }}>
        This desk can post to your Instagram, Facebook and LinkedIn accounts, so it stays behind a
        password.
      </p>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <div className="banner alert" style={{ marginBottom: 14 }}>
          {error}
        </div>
      ) : null}
      <button className="btn solid block" type="submit" disabled={busy || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
