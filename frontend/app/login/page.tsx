"use client";
import React, { useState } from 'react';
import { AuthAPI } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { token, setAuth } = useAuthStore();
  const router = useRouter();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    router.replace('/');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await AuthAPI.login(email, password);
        setAuth(res.accessToken, res.user);
      } else {
        const res = await AuthAPI.register(email, password, displayName || email.split('@')[0]);
        setAuth(res.accessToken, res.user);
      }
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-oak flex flex-col items-center justify-center p-6">
      {/* Tavern Sign */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🏰</div>
        <h1 className="font-display text-4xl font-bold text-parchment mb-2">
          The Quest Board
        </h1>
        <p className="text-parchment-aged text-sm">
          A gathering place for adventurers and dungeon masters
        </p>
      </div>

      {/* Login/Register Card */}
      <div className="card w-full max-w-md">
        <h2 className="font-display text-2xl font-bold mb-4 text-center text-ink">
          {mode === 'login' ? '🗝️ Enter the Tavern' : '✨ Join the Guild'}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1 text-ink">Display Name</label>
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your adventurer name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-ink">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-ink">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-crimson/10 border border-crimson/30 text-crimson text-sm">
              {error}
            </div>
          )}

          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? 'Please wait...' : (mode === 'login' ? '🚪 Enter' : '📜 Register')}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-ink/70">
          {mode === 'login' ? (
            <button className="underline hover:text-ink" onClick={() => setMode('register')}>
              Need an account? Register here
            </button>
          ) : (
            <button className="underline hover:text-ink" onClick={() => setMode('login')}>
              Already have an account? Login here
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

