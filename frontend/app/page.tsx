"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BoardsAPI } from '../lib/api';
import { useAuthStore } from '../store/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BoardsPage() {
  const { token, user, logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: boards, isLoading, error } = useQuery({ queryKey: ['boards'], queryFn: BoardsAPI.list, enabled: !!token });
  const [title, setTitle] = useState('');
  const createMutation = useMutation({ mutationFn: BoardsAPI.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['boards'] }); setTitle(''); } });

  useEffect(()=>{ if(!token){ router.replace('/login'); } }, [token, router]);
  if(!token) return <div className="p-6 text-sm">Redirecting...</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Your Boards</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="opacity-80">{user?.displayName}</span>
          <button onClick={logout} className="btn-outline">Logout</button>
        </div>
      </header>
      <div className="card">
        <form onSubmit={e=>{e.preventDefault(); if(!title.trim()) return; createMutation.mutate({ title });}} className="flex gap-2">
          <input placeholder="New board title" className="input" value={title} onChange={e=>setTitle(e.target.value)} />
          <button className="btn" disabled={createMutation.isPending}>{createMutation.isPending? 'Creating...' : 'Create'}</button>
        </form>
      </div>
      {isLoading && <div>Loading boards...</div>}
      {error && <div className="text-red-600 text-sm">{(error as any).message}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        {boards?.map(b => (
          <Link key={b.id} href={`/boards/${b.id}`} className="card hover:shadow-md transition flex flex-col">
            <div className="text-lg font-semibold mb-1">{b.title}</div>
            <div className="text-xs opacity-70">{b.description || 'No description'}</div>
            <div className="mt-auto pt-2 text-xs flex gap-2 opacity-70"><span>ID:{b.id.slice(0,8)}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
