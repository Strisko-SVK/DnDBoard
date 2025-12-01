'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BoardsAPI, QuestsAPI, BoardOrderAPI } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { Quest, Board } from '@dndboard/shared';
import { QuestCard } from '../../../components/QuestCard';
import { getSocket, SocketEvents } from '../../../lib/socket';

function QuestModal({ quest, onClose, onAccept, onDecline, disabled }: { quest: Quest; onClose: ()=>void; onAccept: ()=>void; onDecline: ()=>void; disabled?: boolean;}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card max-w-xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e=>e.stopPropagation()}>
        <button className="absolute top-2 right-2 text-xs underline" onClick={onClose}>Close</button>
        <h2 className="text-xl font-bold mb-2">{quest.title}</h2>
        <div className="flex flex-wrap gap-1 mb-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-ink/10">{quest.difficulty}</span>
          {quest.tags.map(t=> <span key={t} className="badge">{t}</span>)}
        </div>
        <p className="text-sm whitespace-pre-line mb-4">{quest.summary}</p>
        <div className="prose prose-sm max-w-none mb-6">
          {quest.bodyMarkdown || '*No body*'}
        </div>
        <div className="flex gap-2">
          <button className="btn" disabled={disabled} onClick={onAccept}>Accept</button>
          <button className="btn-outline" disabled={disabled} onClick={onDecline}>Decline</button>
        </div>
      </div>
    </div>
  );
}

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params?.id as string;
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Quest | null>(null);
  const [search, setSearch] = useState('');
  const [newQuestOpen, setNewQuestOpen] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '', bodyMarkdown: '', difficulty: 'Medium', tags: '' });
  const [presence,setPresence]=useState<string[]>([]);

  const { data: board, error: boardError } = useQuery<Board | undefined>({ queryKey: ['board', boardId], queryFn: () => BoardsAPI.get(boardId), enabled: !!boardId && !!token });
  const { data: quests = [], refetch: refetchQuests } = useQuery<Quest[]>({ queryKey: ['quests', boardId], queryFn: () => QuestsAPI.list(boardId), enabled: !!boardId && !!token });

  const isDM = useMemo(()=> !!board && board.dmId === user?.id, [board, user]);

  // Socket realtime updates
  useEffect(() => {
    if (!token || !boardId) return;
    const s = getSocket(token);
    s.emit('subscribe:board', boardId);
    const questUpdate = () => { refetchQuests(); qc.invalidateQueries({ queryKey: ['board', boardId] }); };
    s.on(SocketEvents.QuestUpdate, questUpdate);
    s.on(SocketEvents.BoardUpdate, questUpdate);
    s.on(SocketEvents.PresenceUpdate,(p:any)=>{ if(p.boardId===boardId) setPresence(p.users||[]); });
    return () => {
      s.emit('unsubscribe:board', boardId);
      s.off(SocketEvents.QuestUpdate, questUpdate);
      s.off(SocketEvents.BoardUpdate, questUpdate);
    };
  }, [token, boardId, refetchQuests, qc]);

  const createQuest = useMutation({ mutationFn: (data: any) => QuestsAPI.create(boardId, data), onSuccess: () => { setForm({ title:'', summary:'', bodyMarkdown:'', difficulty:'Medium', tags:''}); setNewQuestOpen(false); refetchQuests(); } });
  const acceptQuest = useMutation({ mutationFn: (id: string) => QuestsAPI.accept(id, { assignedToType: 'Player' }), onSuccess: () => { refetchQuests(); setSelected(null); } });
  const declineQuest = useMutation({ mutationFn: (id: string) => QuestsAPI.decline(id), onSuccess: () => { setSelected(null); } });
  const reorderMutation = useMutation({ mutationFn: (newOrder: string[]) => BoardOrderAPI.reorder(boardId, newOrder), onSuccess: () => refetchQuests() });

  // Redirect moved into effect to avoid SSR router usage
  useEffect(()=>{ if(!token){ router.replace('/login'); } }, [token, router]);
  if(!token) return <div className="p-4 text-sm">Redirecting...</div>;

  if (boardError) return <div className="p-6">Board not found</div>;

  function moveQuest(id: string, dir: -1|1) {
    const currentOrder = board?.questOrder || quests.map(q=>q.id);
    const idx = currentOrder.indexOf(id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= currentOrder.length) return;
    const copy = [...currentOrder];
    [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
    reorderMutation.mutate(copy);
  }

  const filtered = quests.filter(q => !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.summary.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Wooden Plank Toolbar */}
      <div className="toolbar px-4 py-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => router.push('/')} className="btn-outline text-xs px-3 py-1.5">
          ← Boards
        </button>
        <h1 className="font-display text-2xl font-bold flex-1 text-parchment">
          {board?.title || 'Loading...'}
        </h1>

        {/* Lock Indicator */}
        {board?.isLocked && (
          <div className="lock-indicator">
            <span>🔒</span>
            <span>Board Locked</span>
          </div>
        )}

        {/* Online Presence */}
        <div className="flex items-center gap-2 text-parchment-aged text-sm">
          <span className="w-2 h-2 rounded-full bg-forest-light animate-pulse"></span>
          <span>{presence.length} online</span>
        </div>

        {isDM && (
          <button
            className={newQuestOpen ? "btn-decline text-xs" : "btn-primary text-xs"}
            onClick={() => setNewQuestOpen(v => !v)}
          >
            {newQuestOpen ? '✕ Close Form' : '+ New Quest'}
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-parchment-aged border-b border-ink/10 px-4 py-3 flex gap-3 items-center flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            className="input"
            placeholder="🔍 Search quests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-outline text-xs px-3 py-1.5" onClick={() => router.push('/inventory')}>
          📦 My Inventory
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-oak p-4 overflow-y-auto">
        {/* Quest Creation Form */}
        {newQuestOpen && isDM && (
          <div className="mb-6 card animate-slideUp">
            <h2 className="font-display text-xl font-bold mb-4 text-ink">Create New Quest</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                createQuest.mutate({
                  title: form.title,
                  summary: form.summary,
                  bodyMarkdown: form.bodyMarkdown,
                  difficulty: form.difficulty,
                  tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
                });
              }}
              className="space-y-3"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Quest Title *</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                    placeholder="e.g., Wanted: The Cellar Rats"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Difficulty *</label>
                  <select
                    className="input"
                    value={form.difficulty}
                    onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                  >
                    {['Trivial', 'Easy', 'Medium', 'Hard', 'Deadly'].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Summary *</label>
                <textarea
                  className="input"
                  value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                  required
                  rows={3}
                  placeholder="A brief, enticing hook for the quest..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Detailed Description (Markdown)</label>
                <textarea
                  className="input font-mono text-xs"
                  value={form.bodyMarkdown}
                  onChange={e => setForm(f => ({ ...f, bodyMarkdown: e.target.value }))}
                  placeholder="**Objectives:**&#10;- Clear the cellar&#10;- Report back to the innkeeper"
                  rows={6}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Tags (comma separated)</label>
                <input
                  className="input"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="Combat, Mystery, Underdark"
                />
              </div>
              <button className="btn-primary" disabled={createQuest.isPending}>
                {createQuest.isPending ? 'Creating...' : '✨ Create Quest'}
              </button>
            </form>
          </div>
        )}

        {/* Masonry Grid for Quest Cards */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4">
          {filtered.map(q => (
            <QuestCard
              key={q.id}
              quest={q}
              onOpen={setSelected}
              isDM={isDM}
              onMoveUp={() => moveQuest(q.id, -1)}
              onMoveDown={() => moveQuest(q.id, 1)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-4xl mb-4">📜</div>
            <p className="text-ink/60">
              {search ? 'No quests match your search.' : 'No quests on this board yet.'}
            </p>
            {isDM && !search && (
              <button
                className="btn-primary mt-4"
                onClick={() => setNewQuestOpen(true)}
              >
                Create Your First Quest
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quest Modal */}
      {selected && (
        <QuestModal
          quest={selected}
          onClose={() => setSelected(null)}
          disabled={acceptQuest.isPending || declineQuest.isPending}
          onAccept={() => acceptQuest.mutate(selected.id)}
          onDecline={() => declineQuest.mutate(selected.id)}
        />
      )}
    </div>
  );
}
