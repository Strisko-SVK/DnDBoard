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
    <div className="flex flex-col items-center justify-center flex-1 p-6">
      <div className="card w-full max-w-md">
        <h1 className="text-xl font-bold mb-4 text-center">{mode === 'login' ? 'Login' : 'Register'} — DnD Quest Board</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode==='register' && (
            <div>
              <label className="block text-xs font-medium mb-1">Display Name</label>
              <input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
            </div>) }
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button disabled={loading} className="btn w-full" type="submit">{loading? 'Please wait...' : (mode==='login' ? 'Login' : 'Create Account')}</button>
        </form>
        <div className="text-center mt-4 text-sm">
          {mode==='login' ? (
            <button className="underline" onClick={()=>setMode('register')}>Need an account? Register</button>
          ) : (
            <button className="underline" onClick={()=>setMode('login')}>Have an account? Login</button>
          )}
        </div>
      </div>
    </div>
  );
}

