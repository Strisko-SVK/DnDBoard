'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, Suspense } from 'react';
import { useAuthStore } from '../../store/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryAPI, BoardsAPI, QuestsAPI, AssignmentsAPI } from '../../lib/api';
import { QuestAssignment } from '@dndboard/shared';

function InventoryInner(){
  const { token, user } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();
  const boardId = params.get('boardId') || undefined;
  const { data: inventory = [], isLoading } = useQuery<QuestAssignment[]>({ queryKey: ['inventory', boardId, user?.id], queryFn: () => InventoryAPI.list({ boardId, assignedToId: user?.id }), enabled: !!token && !!user });
  const { data: boards = [] } = useQuery({ queryKey: ['boards'], queryFn: BoardsAPI.list, enabled: !!token });
  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        <select className="input w-auto" value={boardId || ''} onChange={e=>{ const v = e.target.value; if (v) router.push(`/inventory?boardId=${v}`); else router.push('/inventory'); }}>
          <option value="">All Boards</option>
          {boards.map((b:any)=> <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </div>
      {isLoading && <div>Loading inventory...</div>}
      {!isLoading && inventory.length === 0 && <div className="text-sm opacity-70">No accepted quests yet.</div>}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {inventory.map((a: any) => (
          <InventoryCard key={a.id} assignment={a} />
        ))}
      </div>
    </>
  );
}

export default function InventoryPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  useEffect(()=> { if(!token) router.replace('/login'); }, [token, router]);
  if(!token) return <div className="p-6 text-sm">Redirecting...</div>;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-outline text-xs" onClick={()=>router.push('/')}>← Boards</button>
        <h1 className="text-2xl font-display font-bold">Inventory</h1>
      </div>
      <Suspense fallback={<div className="text-sm opacity-70">Loading filters...</div>}>
        <InventoryInner />
      </Suspense>
    </div>
  );
}

function InventoryCard({ assignment }: { assignment: any }) {
  const { data: quest } = useQuery({ queryKey: ['quest', assignment.questId], queryFn: () => QuestsAPI.get(assignment.questId) });
  const qc = useQueryClient();
  const completeMutation = useMutation({ mutationFn: (notes?: string) => AssignmentsAPI.complete(assignment.id, notes), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['quest', assignment.questId] }); } });
  const abandonMutation = useMutation({ mutationFn: () => AssignmentsAPI.abandon(assignment.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['quest', assignment.questId] }); } });
  const canComplete = assignment.status === 'Accepted';
  const canAbandon = assignment.status === 'Accepted';
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex justify-between items-start gap-2">
        <div className="font-semibold text-sm">{quest?.title || '...'}</div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink/10">{assignment.status}</span>
      </div>
      <p className="text-xs line-clamp-4 flex-1">{quest?.summary}</p>
      <div className="text-[10px] mt-1 flex gap-2">
        <span className="px-1.5 py-0.5 rounded bg-ink/10">{quest?.difficulty}</span>
        {quest?.tags.slice(0,3).map(t=> <span key={t} className="badge">{t}</span>)}
      </div>
      <div className="flex gap-2 pt-1">
        {canComplete && <button onClick={()=>completeMutation.mutate('Completed via inventory')} disabled={completeMutation.isPending} className="btn flex-1 text-xs">{completeMutation.isPending? '...' : 'Complete'}</button>}
        {canAbandon && <button onClick={()=>abandonMutation.mutate()} disabled={abandonMutation.isPending} className="btn-outline flex-1 text-xs">{abandonMutation.isPending? '...' : 'Abandon'}</button>}
      </div>
    </div>
  );
}
