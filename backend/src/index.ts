import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import {
  Board,
  Quest,
  QuestAssignment,
  Membership,
  User,
  SocketEvents,
} from '@dndboard/shared';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// --- Config (would use env in real app) ---
const JWT_SECRET = 'dev-secret-change';
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// --- In-memory data stores (MVP) ---
const users: Record<string, User & { passwordHash: string }> = {};
const boards: Record<string, Board> = {};
const quests: Record<string, Quest> = {};
const assignments: Record<string, QuestAssignment> = {};
const memberships: Record<string, Membership> = {};
const declines: Record<string, Set<string>> = {}; // per-user declined quests (local preference)
const comments: Record<string, CommentRec> = {};

// Presence: boardId -> set of userIds
const boardPresence: Record<string, Set<string>> = {};

// Simple email index
const userByEmail: Record<string, string> = {};

// --- Express setup ---
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// --- HTTP server & Socket.io ---
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

// Socket auth (very light) ---
io.use((socket: any, next: (err?: any) => void) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // allow anon for now (spectator)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).userId = payload.sub;
  } catch (e) {
    // ignore invalid tokens in MVP
  }
  next();
});

io.on('connection', (socket: any) => {
  let joinedBoards: string[] = [];
  const userId = (socket as any).userId as string | undefined;
  function emitPresence(boardId: string) {
    const usersSet = boardPresence[boardId];
    io.to(`board:${boardId}`).emit(SocketEvents.PresenceUpdate, { boardId, users: usersSet ? Array.from(usersSet) : [] });
  }
  socket.on('subscribe:board', (boardId: string) => {
    socket.join(`board:${boardId}`);
    if (userId) {
      if (!boardPresence[boardId]) boardPresence[boardId] = new Set();
      boardPresence[boardId].add(userId);
      emitPresence(boardId);
    }
    if (!joinedBoards.includes(boardId)) joinedBoards.push(boardId);
  });
  socket.on('unsubscribe:board', (boardId: string) => {
    socket.leave(`board:${boardId}`);
    if (userId && boardPresence[boardId]) {
      boardPresence[boardId].delete(userId);
      emitPresence(boardId);
    }
    joinedBoards = joinedBoards.filter(b => b !== boardId);
  });
  socket.on('disconnect', () => {
    if (userId) {
      joinedBoards.forEach(b => {
        if (boardPresence[b]) {
          boardPresence[b].delete(userId);
          emitPresence(b);
        }
      });
    }
  });
});

// --- Helper functions ---
function now() { return new Date().toISOString(); }

export interface AuthedRequest extends express.Request { userId?: string; user?: User; }

function authMiddleware(req: AuthedRequest, res: express.Response, nextFn: express.NextFunction) {
  const header = (req.headers as any)?.authorization as string | undefined;
  if (!header) return res.status(401).json({ error: 'Missing Authorization' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.userId = payload.sub;
    const u = users[payload.sub];
    if (!u) return res.status(401).json({ error: 'User not found' });
    req.user = u;
    nextFn();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function membershipFor(boardId: string, userId: string) {
  return Object.values(memberships).find(m => m.boardId === boardId && m.userId === userId);
}

function requireBoardAccess(boardId: string, userId: string) {
  return membershipFor(boardId, userId);
}

function isDM(m?: Membership) { return m?.role === 'DM'; }

// --- Auth Endpoints ---
app.post('/auth/register', async (req: express.Request, res: express.Response) => {
  const { email, password, displayName } = (req.body || {}) as any;
  if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
  if (userByEmail[email]) return res.status(409).json({ error: 'Email exists' });
  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User & { passwordHash: string } = {
    id,
    email,
    displayName: displayName || email.split('@')[0],
    avatarUrl: undefined,
    roles: ['Player'],
    createdAt: now(),
    passwordHash,
  };
  users[id] = user;
  userByEmail[email] = id;
  const token = jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ accessToken: token, user: { ...user, passwordHash: undefined } });
});

app.post('/auth/login', async (req: express.Request, res: express.Response) => {
  const { email, password } = (req.body || {}) as any;
  const userId = userByEmail[email];
  if (!userId) return res.status(401).json({ error: 'Invalid credentials' });
  const user = users[userId];
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ accessToken: token, user: { ...user, passwordHash: undefined } });
});

// --- Boards ---
app.get('/boards', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const userId = req.userId!;
  const list = Object.values(boards).filter(b => !!requireBoardAccess(b.id, userId) || b.visibility === 'link');
  res.json(list);
});

app.post('/boards', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const { title, description, background, visibility } = (req.body || {}) as any;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuid();
  const board: Board = {
    id,
    dmId: req.userId!,
    title,
    description,
    background,
    theme: 'parchment',
    visibility: visibility === 'link' ? 'link' : 'invite',
    isLocked: false,
    createdAt: now(),
    updatedAt: now(),
  };
  boards[id] = board;
  const mem: Membership = { id: uuid(), boardId: id, userId: req.userId!, role: 'DM', invitedAt: now(), joinedAt: now() };
  memberships[mem.id] = mem;
  res.status(201).json(board);
});

app.get('/boards/:id', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const b = boards[(req.params as any).id];
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (!requireBoardAccess(b.id, req.userId!) && b.visibility !== 'link') return res.status(403).json({ error: 'Forbidden' });
  const mems = Object.values(memberships).filter(m => m.boardId === b.id);
  const boardQuests = Object.values(quests).filter(q => q.boardId === b.id && q.status !== 'Archived');
  const questCount = boardQuests.length;
  if (!b.questOrder) {
    b.questOrder = boardQuests.sort((a, bq) => a.createdAt.localeCompare(bq.createdAt)).map(q => q.id);
  }
  res.json({ ...b, membership: mems, questCount });
});

app.patch('/boards/:id', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const b = boards[(req.params as any).id];
  if (!b) return res.status(404).json({ error: 'Not found' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, background, isLocked } = (req.body || {}) as any;
  if (title) b.title = title;
  if (description !== undefined) b.description = description;
  if (background !== undefined) b.background = background;
  if (typeof isLocked === 'boolean') b.isLocked = isLocked;
  b.updatedAt = now();
  boards[b.id] = b;
  io.to(`board:${b.id}`).emit(SocketEvents.BoardUpdate, { board: b });
  res.json(b);
});

app.post('/boards/:id/invite', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const b = boards[(req.params as any).id];
  if (!b) return res.status(404).json({ error: 'Not found' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  const { emails } = (req.body || {}) as any;
  if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ error: 'emails[] required' });
  const result: any[] = [];
  emails.forEach((email: string) => {
    let uid = userByEmail[email];
    if (!uid) {
      const id = uuid();
      const user: User & { passwordHash: string } = {
        id,
        email,
        displayName: email.split('@')[0],
        avatarUrl: undefined,
        roles: ['Player'],
        createdAt: now(),
        passwordHash: bcrypt.hashSync(uuid(), 4),
      };
      users[id] = user;
      userByEmail[email] = id;
      uid = id;
    }
    const existing = Object.values(memberships).find(m => m.boardId === b.id && m.userId === uid);
    if (!existing) {
      const m: Membership = { id: uuid(), boardId: b.id, userId: uid, role: 'Player', invitedAt: now(), joinedAt: now() };
      memberships[m.id] = m;
      result.push(m);
    }
  });
  res.json({ invited: result.length, memberships: result });
});

app.delete('/boards/:id/members/:userId', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const b = boards[(req.params as any).id];
  if (!b) return res.status(404).json({ error: 'Not found' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  const targetUserId = (req.params as any).userId;
  const member = Object.values(memberships).find(m => m.boardId === b.id && m.userId === targetUserId);
  if (!member) return res.status(404).json({ error: 'membership not found' });
  if (member.role === 'DM') return res.status(400).json({ error: 'Cannot remove DM' });
  delete memberships[member.id];
  res.json({ removed: true });
});

app.post('/boards/:id/reorder', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const b = boards[(req.params as any).id];
  if (!b) return res.status(404).json({ error: 'Not found' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  const { questIds } = (req.body || {}) as any;
  if (!Array.isArray(questIds)) return res.status(400).json({ error: 'questIds array required' });
  const boardQuestIds = new Set(Object.values(quests).filter(q => q.boardId === b.id && q.status !== 'Archived').map(q => q.id));
  if (!questIds.every((id: string) => boardQuestIds.has(id))) return res.status(400).json({ error: 'Invalid quest id in list' });
  b.questOrder = questIds;
  b.updatedAt = now();
  io.to(`board:${b.id}`).emit(SocketEvents.BoardUpdate, { board: b, type: 'reorder' });
  res.json({ questOrder: b.questOrder });
});

// --- Quests ---
app.get('/boards/:boardId/quests', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const boardId = (req.params as any).boardId;
  const b = boards[boardId];
  if (!b) return res.status(404).json({ error: 'Board not found' });
  if (!requireBoardAccess(boardId, req.userId!) && b.visibility !== 'link') return res.status(403).json({ error: 'Forbidden' });
  const { status, tags, q, includeDeclined } = (req.query || {}) as any;
  let list = Object.values(quests).filter(qt => qt.boardId === boardId && qt.status !== 'Archived');
  if (status && typeof status === 'string') list = list.filter(qt => qt.status === status);
  if (tags && typeof tags === 'string') {
    const tset = new Set(tags.split(','));
    list = list.filter(qt => qt.tags.some(t => tset.has(t)));
  }
  if (q && typeof q === 'string') {
    const term = q.toLowerCase();
    list = list.filter(qt => qt.title.toLowerCase().includes(term) || qt.summary.toLowerCase().includes(term));
  }
  if (!includeDeclined && req.userId && declines[req.userId]) {
    const declined = declines[req.userId];
    list = list.filter(qt => !declined.has(qt.id));
  }
  const bRef = b;
  if (bRef.questOrder) {
    const orderIndex = new Map(bRef.questOrder.map((id, i) => [id, i] as const));
    list.sort((a, bq) => (orderIndex.get(a.id) ?? 9999) - (orderIndex.get(bq.id) ?? 9999));
  }
  res.json(list);
});

app.post('/boards/:boardId/quests', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const boardId = (req.params as any).boardId;
  const b = boards[boardId];
  if (!b) return res.status(404).json({ error: 'Board not found' });
  const mem = requireBoardAccess(boardId, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  const { title, summary, bodyMarkdown, images = [], tags = [], difficulty = 'Medium', rewards = {}, visibility = 'publicOnBoard', allowMultipleAccepts = false, status } = (req.body || {}) as any;
  if (!title || !summary) return res.status(400).json({ error: 'title & summary required' });
  const id = uuid();
  const quest: Quest = {
    id,
    boardId,
    title,
    summary,
    bodyMarkdown: bodyMarkdown || '',
    images,
    tags,
    difficulty,
    rewards,
    status: status === 'Draft' ? 'Draft' : 'Posted',
    visibility,
    allowMultipleAccepts: !!allowMultipleAccepts,
    createdBy: req.userId!,
    createdAt: now(),
    updatedAt: now(),
  };
  quests[id] = quest;
  const bRef = boards[boardId];
  if (bRef) {
    if (!bRef.questOrder) bRef.questOrder = [];
    bRef.questOrder.push(id);
  }
  io.to(`board:${boardId}`).emit(SocketEvents.QuestUpdate, { type: 'created', quest });
  res.status(201).json(quest);
});

app.get('/quests/:id', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  if (!requireBoardAccess(b.id, req.userId!) && b.visibility !== 'link') return res.status(403).json({ error: 'Forbidden' });
  res.json(q);
});

app.patch('/quests/:id', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem) && q.createdBy !== req.userId) return res.status(403).json({ error: 'Forbidden' });
  const editable = ['title', 'summary', 'bodyMarkdown', 'images', 'tags', 'difficulty', 'rewards', 'visibility', 'allowMultipleAccepts', 'status'] as const;
  editable.forEach(field => {
    if ((req.body as any)[field] !== undefined) { (q as any)[field] = (req.body as any)[field]; }
  });
  q.updatedAt = now();
  quests[q.id] = q;
  io.to(`board:${q.boardId}`).emit(SocketEvents.QuestUpdate, { type: 'updated', quest: q });
  res.json(q);
});

app.post('/quests/:id/archive', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!isDM(mem)) return res.status(403).json({ error: 'Forbidden' });
  q.status = 'Archived';
  q.updatedAt = now();
  io.to(`board:${q.boardId}`).emit(SocketEvents.QuestUpdate, { type: 'archived', questId: q.id });
  res.json({ archived: true });
});

app.post('/quests/:id/accept', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  if (b.isLocked) return res.status(423).json({ error: 'Board locked' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!mem) return res.status(403).json({ error: 'Forbidden' });
  const { assignedToType = 'Player', assignedToId } = (req.body || {}) as any;
  const targetId = assignedToType === 'Player' ? (assignedToId || req.userId) : assignedToId;
  if (!targetId) return res.status(400).json({ error: 'assignedToId required' });
  if (!q.allowMultipleAccepts) {
    const existing = Object.values(assignments).find(a => a.questId === q.id && a.status === 'Accepted');
    if (existing) return res.status(409).json({ error: 'Already accepted' });
    q.status = 'Accepted';
  }
  const id = uuid();
  const assignment: QuestAssignment = {
    id,
    questId: q.id,
    boardId: q.boardId,
    assignedToType: assignedToType === 'Party' ? 'Party' : 'Player',
    assignedToId: targetId,
    status: 'Accepted',
    acceptedAt: now(),
  };
  assignments[id] = assignment;
  q.updatedAt = now();
  io.to(`board:${q.boardId}`).emit(SocketEvents.QuestUpdate, { type: 'accepted', quest: q, assignment });
  res.status(201).json({ assignment, quest: q });
});

app.post('/quests/:id/decline', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!mem) return res.status(403).json({ error: 'Forbidden' });
  if (!declines[mem.userId]) declines[mem.userId] = new Set();
  declines[mem.userId].add(q.id);
  res.status(204).end();
});

// --- Inventory ---
app.get('/inventory', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const { boardId, assignedToId } = (req.query || {}) as any;
  let list = Object.values(assignments);
  if (boardId && typeof boardId === 'string') list = list.filter(a => a.boardId === boardId);
  if (assignedToId && typeof assignedToId === 'string') list = list.filter(a => a.assignedToId === assignedToId);
  res.json(list);
});

// Health
app.get('/health', (_req: express.Request, res: express.Response) => res.json({ ok: true }));

console.log('[backend] initializing (ts source)...');
process.on('uncaughtException', (err) => {
  console.error('[backend] uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[backend] unhandledRejection', reason);
});

console.log('[backend] Source loaded, initializing server...');

// Seed initial admin user if not present
(function seedAdmin(){
  if (!userByEmail[ADMIN_EMAIL]) {
    const id = uuid();
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    const admin: User & { passwordHash: string } = {
      id,
      email: ADMIN_EMAIL,
      displayName: 'Admin',
      avatarUrl: undefined,
      roles: ['Admin','DM','Player'],
      createdAt: now(),
      passwordHash,
    };
    users[id] = admin;
    userByEmail[ADMIN_EMAIL] = id;
    console.log(`[backend] Seeded admin account email=${ADMIN_EMAIL} password=${ADMIN_PASSWORD}`);
  }
})();

server.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
});
app.post('/assignments/:id/complete', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const assignment = assignments[(req.params as any).id];
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  const q = quests[assignment.questId];
  if (!q) return res.status(404).json({ error: 'Quest missing' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  const mem = requireBoardAccess(b.id, req.userId!);
  if (!mem) return res.status(403).json({ error: 'Forbidden' });
  if (assignment.status !== 'Accepted') return res.status(400).json({ error: 'Not in Accepted state' });
  assignment.status = 'Completed';
  assignment.completedAt = now();
  if ((req.body as any)?.notes) assignment.notes = (req.body as any).notes;
  assignments[assignment.id] = assignment;
  // If single-accept quest or all assignments completed -> mark quest Completed
  if (!q.allowMultipleAccepts || Object.values(assignments).filter(a => a.questId === q.id && a.status !== 'Completed').length === 0) {
    q.status = 'Completed';
    q.updatedAt = now();
  }
  io.to(`board:${q.boardId}`).emit(SocketEvents.QuestUpdate, { type: 'completed', quest: q, assignment });
  res.json({ assignment, quest: q });
});
app.get('/quests/:id/assignments', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  if (!requireBoardAccess(b.id, req.userId!)) return res.status(403).json({ error: 'Forbidden' });
  const list = Object.values(assignments).filter(a => a.questId === q.id);
  res.json(list);
});
function requireAdmin(req: AuthedRequest, res: express.Response, nextFn: express.NextFunction) {
  if (!req.user || !req.user.roles.includes('Admin')) return res.status(403).json({ error: 'Admin only' });
  nextFn();
}
app.get('/admin/users', authMiddleware, requireAdmin, (_req: AuthedRequest, res: express.Response) => {
  const list = Object.values(users).map(u => ({ id: u.id, email: u.email, displayName: u.displayName, roles: u.roles, createdAt: u.createdAt }));
  res.json(list);
});
app.post('/admin/promote', authMiddleware, requireAdmin, (req: AuthedRequest, res: express.Response) => {
  const { userId, role } = (req.body || {}) as any;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const target = users[userId];
  if (!target) return res.status(404).json({ error: 'User not found' });
  const addRole = role || 'Admin';
  if (!target.roles.includes(addRole)) target.roles.push(addRole);
  res.json({ id: target.id, roles: target.roles });
});
app.post('/quests/:id/comments', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Quest not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  if (!requireBoardAccess(b.id, req.userId!)) return res.status(403).json({ error: 'Forbidden' });
  const { bodyMarkdown, parentId } = (req.body || {}) as any;
  if (!bodyMarkdown || typeof bodyMarkdown !== 'string') return res.status(400).json({ error: 'bodyMarkdown required' });
  const id = uuid();
  const rec: CommentRec = { id, questId: q.id, authorId: req.userId!, bodyMarkdown, createdAt: now(), parentId };
  comments[id] = rec;
  io.to(`board:${q.boardId}`).emit(SocketEvents.CommentNew, { comment: rec });
  res.status(201).json(rec);
});
app.get('/quests/:id/comments', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const q = quests[(req.params as any).id];
  if (!q) return res.status(404).json({ error: 'Quest not found' });
  const b = boards[q.boardId];
  if (!b) return res.status(404).json({ error: 'Board missing' });
  if (!requireBoardAccess(b.id, req.userId!)) return res.status(403).json({ error: 'Forbidden' });
  const list = Object.values(comments).filter(c => c.questId === q.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  res.json(list);
});
app.post('/assignments/:id/abandon', authMiddleware, (req: AuthedRequest, res: express.Response) => {
  const assignment = assignments[(req.params as any).id];
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  const q = quests[assignment.questId];
  if (!q) return res.status(404).json({ error: 'Quest missing' });
  if (assignment.status !== 'Accepted') return res.status(400).json({ error: 'Not in Accepted state' });
  assignment.status = 'Abandoned';
  assignments[assignment.id] = assignment;
  // If quest was single-accept revert status if no other accepted assignments
  if (!q.allowMultipleAccepts) {
    const stillAccepted = Object.values(assignments).some(a => a.questId === q.id && a.status === 'Accepted');
    if (!stillAccepted && q.status === 'Accepted') {
      q.status = 'Posted';
      q.updatedAt = now();
    }
  }
  io.to(`board:${q.boardId}`).emit(SocketEvents.QuestUpdate, { type: 'abandoned', quest: q, assignment });
  res.json({ assignment, quest: q });
});
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'DnD Board API', version: '0.1.0' },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ bearerAuth: [] }]
  },
  apis: []
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Local comment record shape (MVP) matching in-memory store usage
interface CommentRec { id: string; questId: string; authorId: string; bodyMarkdown: string; createdAt: string; parentId?: string; }
