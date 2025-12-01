'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, Suspense } from 'react';
import { useAuthStore } from '../../store/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryAPI, BoardsAPI, QuestsAPI, AssignmentsAPI } from '../../lib/api';
import { QuestAssignment } from '@dndboard/shared';

function InventoryInner() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();
  const boardId = params.get('boardId') || undefined;
  const { data: inventory = [], isLoading } = useQuery<QuestAssignment[]>({
    queryKey: ['inventory', boardId, user?.id],
    queryFn: () => InventoryAPI.list({ boardId, assignedToId: user?.id }),
    enabled: !!token && !!user
  });
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: BoardsAPI.list,
    enabled: !!token
  });

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center mb-6">
        <label className="text-sm font-medium text-parchment-aged">Filter by Board:</label>
        <select
          className="input w-auto bg-parchment"
          value={boardId || ''}
          onChange={e => {
            const v = e.target.value;
            if (v) router.push(`/inventory?boardId=${v}`);
            else router.push('/inventory');
          }}
        >
          <option value="">All Boards</option>
          {boards.map((b: any) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="text-center text-parchment-aged py-12">
          <div className="text-4xl mb-2">⏳</div>
          <div>Loading your quests...</div>
        </div>
      )}

      {!isLoading && inventory.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🎒</div>
          <h3 className="font-display text-xl font-bold text-ink mb-2">Your Satchel is Empty</h3>
          <p className="text-ink/60 mb-4">You haven&apos;t accepted any quests yet.</p>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Browse Quest Boards
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {inventory.map((a: any) => (
          <InventoryCard key={a.id} assignment={a} />
        ))}
      </div>
    </>
  );
}

export default function InventoryPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return <div className="p-6 text-sm text-parchment">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-oak">
      {/* Toolbar Header */}
      <div className="toolbar px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button className="btn-outline text-xs px-3 py-1.5" onClick={() => router.push('/')}>
            ← Back to Boards
          </button>
          <h1 className="font-display text-3xl font-bold text-parchment flex items-center gap-2">
            <span>🎒</span>
            <span>My Quest Satchel</span>
          </h1>
          <div className="ml-auto text-parchment-aged text-sm">
            🧙 {user?.displayName}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Suspense fallback={
          <div className="text-sm text-parchment-aged">Loading filters...</div>
        }>
          <InventoryInner />
        </Suspense>
      </div>
    </div>
  );
}

function InventoryCard({ assignment }: { assignment: any }) {
  const { data: quest } = useQuery({
    queryKey: ['quest', assignment.questId],
    queryFn: () => QuestsAPI.get(assignment.questId)
  });
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (notes?: string) => AssignmentsAPI.complete(assignment.id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['quest', assignment.questId] });
    }
  });

  const abandonMutation = useMutation({
    mutationFn: () => AssignmentsAPI.abandon(assignment.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['quest', assignment.questId] });
    }
  });

  const canComplete = assignment.status === 'Accepted';
  const canAbandon = assignment.status === 'Accepted';
  const isCompleted = assignment.status === 'Completed';

  return (
    <div className="card flex flex-col gap-3 min-h-[200px]">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-display font-bold text-base text-ink flex-1 leading-tight">
          {quest?.title || 'Loading...'}
        </h3>
        <span className={assignment.status === 'Completed' ? 'status-completed' : 'status-accepted'}>
          {assignment.status}
        </span>
      </div>

      {/* Quest Info */}
      {quest && (
        <>
          <div className="flex flex-wrap gap-1">
            <span className={`difficulty-${quest.difficulty.toLowerCase()} text-[10px] px-2 py-0.5`}>
              {quest.difficulty}
            </span>
            {quest.tags.slice(0, 3).map(t => (
              <span key={t} className="badge text-[10px]">#{t}</span>
            ))}
          </div>

          <p className="text-sm text-ink/80 line-clamp-3 flex-1 leading-relaxed">
            {quest.summary}
          </p>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 mt-auto border-t border-ink/10">
        {canComplete && (
          <button
            onClick={() => completeMutation.mutate('Completed via inventory')}
            disabled={completeMutation.isPending}
            className="btn-success flex-1 text-xs"
          >
            {completeMutation.isPending ? '...' : '✓ Complete'}
          </button>
        )}
        {canAbandon && (
          <button
            onClick={() => abandonMutation.mutate()}
            disabled={abandonMutation.isPending}
            className="btn-decline flex-1 text-xs"
          >
            {abandonMutation.isPending ? '...' : '✕ Abandon'}
          </button>
        )}
        {isCompleted && (
          <div className="flex-1 text-center text-sm text-forest font-medium">
            ✓ Quest Complete!
          </div>
        )}
      </div>
    </div>
  );
}
