import { Board, Quest, User, Comment as QuestComment, QuestAssignment } from '@dndboard/shared';
import { useAuthStore } from '../store/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try { const body = await res.json(); msg = body.error || msg; } catch (e) { /* ignore parse error */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as any;
  return res.json();
}

export const AuthAPI = {
  register(email: string, password: string, displayName?: string) {
    return api<{ accessToken: string; user: any }>(`/auth/register`, { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
  },
  login(email: string, password: string) {
    return api<{ accessToken: string; user: any }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) });
  }
};

export const BoardsAPI = {
  list(): Promise<Board[]> { return api<Board[]>(`/boards`); },
  create(data: Partial<Board> & { title: string }): Promise<Board> { return api<Board>(`/boards`, { method: 'POST', body: JSON.stringify(data) }); },
  get(id: string): Promise<Board> { return api<Board>(`/boards/${id}`); },
  update(id: string, data: Partial<Board>) { return api<Board>(`/boards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
};

export const QuestsAPI = {
  list(boardId: string, opts?: { includeDeclined?: boolean }): Promise<Quest[]> { const p = opts?.includeDeclined ? `?includeDeclined=true` : ''; return api<Quest[]>(`/boards/${boardId}/quests${p}`); },
  create(boardId: string, data: Partial<Quest> & { title: string; summary: string }): Promise<Quest> { return api<Quest>(`/boards/${boardId}/quests`, { method: 'POST', body: JSON.stringify(data) }); },
  get(id: string): Promise<Quest> { return api<Quest>(`/quests/${id}`); },
  update(id: string, data: Partial<Quest>) { return api<Quest>(`/quests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  accept(id: string, payload: any) { return api(`/quests/${id}/accept`, { method: 'POST', body: JSON.stringify(payload) }); },
  decline(id: string) { return api<void>(`/quests/${id}/decline`, { method: 'POST' }); }
};

export const BoardOrderAPI = {
  reorder(boardId: string, questIds: string[]) { return api(`/boards/${boardId}/reorder`, { method: 'POST', body: JSON.stringify({ questIds }) }); }
};

export const InventoryAPI = {
  list(params: { boardId?: string; assignedToId?: string } = {}): Promise<QuestAssignment[]> {
    const query = new URLSearchParams();
    if (params.boardId) query.set('boardId', params.boardId);
    if (params.assignedToId) query.set('assignedToId', params.assignedToId);
    const qs = query.toString();
    return api<QuestAssignment[]>(`/inventory${qs ? `?${qs}` : ''}`);
  }
};

export const CommentsAPI = {
  list(questId: string): Promise<QuestComment[]> { return api<QuestComment[]>(`/quests/${questId}/comments`); },
  create(questId: string, bodyMarkdown: string, parentId?: string): Promise<QuestComment> { return api<QuestComment>(`/quests/${questId}/comments`, { method: 'POST', body: JSON.stringify({ bodyMarkdown, parentId }) }); }
};

export const AssignmentsAPI = {
  complete(id: string, notes?: string) { return api(`/assignments/${id}/complete`, { method: 'POST', body: JSON.stringify(notes ? { notes } : {}) }); },
  abandon(id: string) { return api(`/assignments/${id}/abandon`, { method: 'POST', body: JSON.stringify({}) }); }
};

export const AdminAPI = {
  users(): Promise<User[]> { return api<User[]>(`/admin/users`); },
  promote(userId: string, role?: string): Promise<{ id: string; roles: string[] }> { return api(`/admin/promote`, { method: 'POST', body: JSON.stringify({ userId, role }) }); }
};
