'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BoardsAPI, QuestsAPI, BoardOrderAPI, CommentsAPI } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { Quest, Board } from '@dndboard/shared';
import { QuestCard } from '../../../components/QuestCard';
import { getSocket, SocketEvents } from '../../../lib/socket';

function QuestModal({ quest, onClose, onAccept, onDecline, disabled, comments, onAddComment }: { quest: Quest; onClose: ()=>void; onAccept: ()=>void; onDecline: ()=>void; disabled?: boolean; comments: any[]; onAddComment:(body:string)=>void;}) {
  const [newComment,setNewComment]=useState('');
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
        <div className="flex gap-2 mb-4">
          <button className="btn" disabled={disabled} onClick={onAccept}>Accept</button>
          <button className="btn-outline" disabled={disabled} onClick={onDecline}>Decline</button>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Comments ({comments.length})</h3>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {comments.map(c=> <div key={c.id} className="text-xs p-2 rounded bg-ink/5"><span className="font-semibold mr-2">{c.authorId.slice(0,6)}</span>{c.bodyMarkdown}</div>)}
            {comments.length===0 && <div className="text-xs opacity-60">No comments yet.</div>}
          </div>
          <form onSubmit={e=>{e.preventDefault(); if(!newComment.trim()) return; onAddComment(newComment.trim()); setNewComment('');}} className="flex gap-2">
            <input className="input flex-1" placeholder="Add a comment" value={newComment} onChange={e=>setNewComment(e.target.value)} />
            <button className="btn" disabled={!newComment.trim()}>Post</button>
          </form>
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
  const [questComments,setQuestComments]=useState<Record<string, any[]>>({});

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
    s.on(SocketEvents.CommentNew,(p:any)=>{ const c=p.comment; if(!c) return; setQuestComments(prev=>({...prev,[c.questId]:[...(prev[c.questId]||[]),c]})); });
    return () => {
      s.emit('unsubscribe:board', boardId);
      s.off(SocketEvents.QuestUpdate, questUpdate);
      s.off(SocketEvents.BoardUpdate, questUpdate);
    };
  }, [token, boardId, refetchQuests, qc]);

  const createQuest = useMutation({ mutationFn: (data: any) => QuestsAPI.create(boardId, data), onSuccess: () => { setForm({ title:'', summary:'', bodyMarkdown:'', difficulty:'Medium', tags:''}); setNewQuestOpen(false); refetchQuests(); } });
  const acceptQuest = useMutation({ mutationFn: (id: string) => QuestsAPI.accept(id, { assignedToType: 'Player' }), onSuccess: () => { refetchQuests(); setSelected(null); } });
  const declineQuest = useMutation({ mutationFn: (id: string) => QuestsAPI.decline(id), onSuccess: () => { setSelected(null); refetchQuests(); } });
  const reorderMutation = useMutation({ mutationFn: (newOrder: string[]) => BoardOrderAPI.reorder(boardId, newOrder), onSuccess: () => refetchQuests() });

  useEffect(()=>{ // load comments for selected quest when opened
    if(selected){
      if(!questComments[selected.id]){
        CommentsAPI.list(selected.id).then(list=> setQuestComments(prev=>({...prev,[selected.id]:list})) ).catch(()=>{});
      }
    }
  },[selected,questComments]);

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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>router.push('/')} className="btn-outline text-xs">← Boards</button>
        <h1 className="text-2xl font-display font-bold flex-1">{board?.title || 'Loading...'}</h1>
        {isDM && <button className="btn-outline" onClick={()=>setNewQuestOpen(v=>!v)}>{newQuestOpen ? 'Close Quest Form' : 'New Quest'}</button>}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <input className="input" placeholder="Search quests..." value={search} onChange={e=>setSearch(e.target.value)} />
        {board?.isLocked && <span className="text-sm px-2 py-1 rounded bg-red-200">Locked</span>}
        <button className="btn-outline ml-auto" onClick={()=>router.push('/inventory')}>Inventory</button>
        <span className="text-xs opacity-70">Online: {presence.length}</span>
      </div>
      {newQuestOpen && isDM && (
        <form onSubmit={e=>{e.preventDefault(); createQuest.mutate({ title: form.title, summary: form.summary, bodyMarkdown: form.bodyMarkdown, difficulty: form.difficulty, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) });}} className="card space-y-2">
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Title</label>
              <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
            </div>
            <div>
              <label className="text-xs font-medium">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:e.target.value}))}>
                {['Trivial','Easy','Medium','Hard','Deadly'].map(d=> <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Summary</label>
            <textarea className="input" value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))} required rows={3} />
          </div>
          <div>
            <label className="text-xs font-medium">Body (Markdown)</label>
            <textarea className="input font-mono text-xs" value={form.bodyMarkdown} onChange={e=>setForm(f=>({...f,bodyMarkdown:e.target.value}))} placeholder="Detailed quest description..." rows={6} />
          </div>
          <div>
            <label className="text-xs font-medium">Tags (comma separated)</label>
            <input className="input" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
          </div>
          <button className="btn" disabled={createQuest.isPending}>{createQuest.isPending? 'Creating...' : 'Create Quest'}</button>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map(q => (
          <QuestCard key={q.id} quest={q} onOpen={setSelected} isDM={isDM} onMoveUp={()=>moveQuest(q.id,-1)} onMoveDown={()=>moveQuest(q.id,1)} />
        ))}
      </div>

      {selected && (
        <QuestModal quest={selected} onClose={()=>setSelected(null)} disabled={acceptQuest.isPending || declineQuest.isPending}
          onAccept={()=>acceptQuest.mutate(selected.id)}
          onDecline={()=>declineQuest.mutate(selected.id)}
          comments={questComments[selected.id]||[]}
          onAddComment={(body)=>{
            CommentsAPI.create(selected.id,body).catch(()=>{});
          }} />
      )}
    </div>
  );
}
