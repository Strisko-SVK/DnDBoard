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

  useEffect(() => { if (!token) { router.replace('/login'); } }, [token, router]);
  if (!token) return <div className="p-6 text-sm text-parchment">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-oak">
      {/* Header */}
      <div className="toolbar px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-parchment">Quest Boards</h1>
          <div className="flex items-center gap-4 text-sm text-parchment-aged">
            <span className="hidden sm:inline">🧙 {user?.displayName}</span>
            <button onClick={logout} className="btn-outline text-xs px-3 py-1.5">Logout</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Create Board Form */}
        <div className="card max-w-2xl mx-auto">
          <h2 className="font-display text-xl font-bold text-ink mb-3">Create New Board</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!title.trim()) return;
              createMutation.mutate({ title });
            }}
            className="flex gap-2"
          >
            <input
              placeholder="Enter board title..."
              className="input flex-1"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <button className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : '+ Create'}
            </button>
          </form>
        </div>

        {/* Loading/Error States */}
        {isLoading && (
          <div className="text-center text-parchment-aged">
            <div className="text-4xl mb-2">⏳</div>
            <div>Loading boards...</div>
          </div>
        )}
        {error && (
          <div className="card max-w-2xl mx-auto bg-crimson/10 border-crimson/30">
            <div className="text-crimson text-sm">{(error as any).message}</div>
          </div>
        )}

        {/* Boards Grid */}
        {boards && boards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map(b => (
              <Link
                key={b.id}
                href={`/boards/${b.id}`}
                className="card-hover flex flex-col min-h-[140px]"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="text-2xl">📋</div>
                  <div className="flex-1">
                    <div className="font-display text-lg font-bold text-ink leading-tight mb-1">
                      {b.title}
                    </div>
                    <div className="text-xs text-ink/60">
                      {b.description || 'No description'}
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-3 flex items-center gap-2 text-xs text-ink/50 border-t border-ink/10">
                  <span>ID: {b.id.slice(0, 8)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {boards && boards.length === 0 && !isLoading && (
          <div className="card max-w-2xl mx-auto text-center py-12">
            <div className="text-6xl mb-4">🏰</div>
            <h3 className="font-display text-xl font-bold text-ink mb-2">No Quest Boards Yet</h3>
            <p className="text-ink/60 mb-4">Create your first board to start organizing quests!</p>
          </div>
        )}
      </div>
    </div>
  );
}
