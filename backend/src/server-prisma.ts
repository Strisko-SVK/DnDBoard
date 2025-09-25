import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 4100; // run separate port for prisma server
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Transient (in-memory) only features not yet persisted
const declines: Record<string, Set<string>> = {}; // userId -> declined quest ids
const presence: Record<string, Set<string>> = {}; // boardId -> userIds

// Express & Socket.io
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit:'1mb' }));
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors:{ origin:'*' } });

io.use((socket,next)=>{
  const token = socket.handshake.auth?.token;
  if(token){ try { const p:any = jwt.verify(token, JWT_SECRET); (socket as any).userId = p.sub; } catch(e){ /* invalid token ignored */ } }
  next();
});

io.on('connection', socket => {
  const userId = (socket as any).userId as string | undefined;
  const joined: string[] = [];
  function emit(boardId:string){
    io.to(`board:${boardId}`).emit('presence:update', { boardId, users: presence[boardId] ? Array.from(presence[boardId]) : [] });
  }
  socket.on('subscribe:board',(boardId:string)=>{
    socket.join(`board:${boardId}`);
    if(userId){ if(!presence[boardId]) presence[boardId] = new Set(); presence[boardId].add(userId); emit(boardId); }
    if(!joined.includes(boardId)) joined.push(boardId);
  });
  socket.on('unsubscribe:board',(boardId:string)=>{
    socket.leave(`board:${boardId}`);
    if(userId && presence[boardId]){ presence[boardId].delete(userId); emit(boardId); }
  });
  socket.on('disconnect',()=>{ if(userId){ joined.forEach((b:string)=>{ if(presence[b]){ presence[b].delete(userId); emit(b);} }); } });
});

// Helpers
function tokenFor(id:string){ return jwt.sign({ sub:id }, JWT_SECRET, { expiresIn:'7d' }); }
async function userWithRoles(id:string){ return prisma.user.findUnique({ where:{ id }, include:{ roles:true } }); }
function toUser(u:any){ return { id:u.id, email:u.email, displayName:u.displayName, avatarUrl:u.avatarUrl, roles:u.roles.map((r:any)=>r.role), createdAt:u.createdAt }; }
async function ensureAdmin(){
  const existing = await prisma.user.findUnique({ where:{ email: ADMIN_EMAIL }, include:{ roles:true } });
  if(!existing){
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD,10);
    await prisma.user.create({ data:{ email: ADMIN_EMAIL, passwordHash, displayName:'Admin', roles:{ create:[{ role:'Admin'},{ role:'DM'},{ role:'Player'}] } } });
    console.log(`[prisma-server] Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }
}

// Auth middleware
import type { Request, Response, NextFunction } from 'express';
interface AuthedReq extends Request { userId?:string; user?: any }
async function auth(req:AuthedReq,res:Response,next:NextFunction){
  const h = req.headers.authorization; if(!h) return res.status(401).json({ error:'Missing Authorization'});
  const t = h.replace('Bearer ','');
  try { const p:any = jwt.verify(t, JWT_SECRET); req.userId=p.sub; const u = await userWithRoles(p.sub); if(!u) return res.status(401).json({ error:'User not found'}); req.user=u; next(); } catch{ return res.status(401).json({ error:'Invalid token'}); }
}

// Serialization helpers (re-added)
function safeJson(str:string, fallback:any){ try { return JSON.parse(str); } catch { return fallback; } }
function serializeQuest(q:any){
  if(!q) return q;
  return {
    id: q.id,
    boardId: q.boardId,
    title: q.title,
    summary: q.summary,
    bodyMarkdown: q.bodyMarkdown || '',
    images: (q.images||'').split(',').filter(Boolean),
    tags: (q.tags||'').split(',').filter(Boolean),
    difficulty: q.difficulty,
    rewards: q.rewardsJson ? safeJson(q.rewardsJson, {}) : {},
    status: q.status,
    visibility: q.visibility,
    allowMultipleAccepts: !!q.allowMultipleAccepts,
    createdBy: q.createdById,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt
  };
}

// Routes
app.get('/health',(_req,res)=>res.json({ ok:true, db:true }));

app.post('/auth/register', async (req,res)=>{
  const { email, password, displayName } = req.body || {};
  if(!email || !password) return res.status(400).json({ error:'Email & password required'});
  const existing = await prisma.user.findUnique({ where:{ email } }); if(existing) return res.status(409).json({ error:'Email exists'});
  const passwordHash = await bcrypt.hash(password,10);
  const user = await prisma.user.create({ data:{ email, passwordHash, displayName: displayName || email.split('@')[0], roles:{ create:{ role:'Player'} } }, include:{ roles:true } });
  res.json({ accessToken: tokenFor(user.id), user: toUser(user) });
});

app.post('/auth/login', async (req,res)=>{
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where:{ email }, include:{ roles:true } });
  if(!user) return res.status(401).json({ error:'Invalid credentials'});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error:'Invalid credentials'});
  res.json({ accessToken: tokenFor(user.id), user: toUser(user) });
});

app.get('/boards', auth, async (req:AuthedReq,res)=>{
  const uid = req.userId!;
  const memberBoards = await prisma.board.findMany({ where:{ memberships:{ some:{ userId: uid } } }, include:{ quests:true } });
  const linkBoards = await prisma.board.findMany({ where:{ visibility:'link' }, include:{ quests:true } });
  const map:Record<string,any>={}; memberBoards.concat(linkBoards).forEach((b:any)=>map[b.id]=b);
  res.json(Object.values(map).map((b:any)=>({ id:b.id, dmId:b.dmId, title:b.title, description:b.description, visibility:b.visibility, isLocked:b.isLocked, createdAt:b.createdAt, updatedAt:b.updatedAt, questOrder: b.questOrder? JSON.parse(b.questOrder): undefined })));
});

app.post('/boards', auth, async (req:AuthedReq,res)=>{
  const { title, description, background, visibility } = req.body || {};
  if(!title) return res.status(400).json({ error:'Title required'});
  const board = await prisma.board.create({ data:{ title, description, background, visibility: visibility==='link' ? 'link':'invite', dmId: req.userId!, memberships:{ create:{ userId:req.userId!, role:'DM', invitedAt:new Date(), joinedAt:new Date() } } } });
  res.status(201).json({ ...board, questOrder: undefined });
});

app.get('/boards/:id', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params;
  const board = await prisma.board.findUnique({ where:{ id }, include:{ memberships:true, quests:true } });
  if(!board) return res.status(404).json({ error:'Not found'});
  const member = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId:id, userId: req.userId! } } });
  if(!member && board.visibility!=='link') return res.status(403).json({ error:'Forbidden'});
  const questCount = board.quests.filter((q:any)=>q.status!=='Archived').length;
  let order = board.questOrder? JSON.parse(board.questOrder): undefined;
  if(!order) order = board.quests.sort((a:any,b:any)=> a.createdAt.getTime()-b.createdAt.getTime()).map((q:any)=>q.id);
  res.json({ id: board.id, dmId: board.dmId, title: board.title, description: board.description, visibility: board.visibility, isLocked: board.isLocked, createdAt: board.createdAt, updatedAt: board.updatedAt, membership: board.memberships, questCount, questOrder: order });
});

app.post('/boards/:id/quests', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const { title, summary, difficulty='Medium', tags=[], images=[], bodyMarkdown='', rewards={}, visibility='publicOnBoard', allowMultipleAccepts=false, status } = req.body || {};
  if(!title || !summary) return res.status(400).json({ error:'title & summary required'});
  const board = await prisma.board.findUnique({ where:{ id } });
  if(!board) return res.status(404).json({ error:'Board not found'});
  if(board.dmId !== req.userId) return res.status(403).json({ error:'Forbidden'});
  const quest = await prisma.quest.create({ data:{ boardId:id, title, summary, difficulty, bodyMarkdown, tags: tags.join(','), images: images.join(','), visibility, allowMultipleAccepts, status: status==='Draft' ? 'Draft':'Posted', createdById: req.userId!, rewardsJson: JSON.stringify(rewards) } });
  const order = board.questOrder? JSON.parse(board.questOrder): []; order.push(quest.id);
  await prisma.board.update({ where:{ id }, data:{ questOrder: JSON.stringify(order) } });
  const sQuest = serializeQuest(quest);
  io.to(`board:${id}`).emit('quest:update', { type:'created', quest: sQuest });
  res.status(201).json(sQuest);
});

app.get('/boards/:id/quests', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const board = await prisma.board.findUnique({ where:{ id } });
  if(!board) return res.status(404).json({ error:'Board not found'});
  const member = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId:id, userId:req.userId! } } });
  if(!member && board.visibility!=='link') return res.status(403).json({ error:'Forbidden'});
  const { status, tags, q, includeDeclined } = req.query as any;
  let quests = await prisma.quest.findMany({ where:{ boardId:id, NOT:{ status:'Archived' } } });
  if(status && typeof status==='string') quests = quests.filter((q:any)=> q.status === status);
  if(tags && typeof tags==='string') {
    const wanted = new Set(tags.split(',').map((t:string)=>t.trim()).filter(Boolean));
    quests = quests.filter((q:any)=> q.tags.split(',').some((t:string)=>wanted.has(t)));
  }
  if(q && typeof q==='string') {
    const term = q.toLowerCase();
    quests = quests.filter((r:any)=> r.title.toLowerCase().includes(term) || r.summary.toLowerCase().includes(term));
  }
  if(!includeDeclined && declines[req.userId!]) {
    const dset = declines[req.userId!];
    quests = quests.filter((r:any)=> !dset.has(r.id));
  }
  if(board.questOrder){ const idx = new Map((JSON.parse(board.questOrder) as string[]).map((qid:string,i:number)=>[qid,i])); quests.sort((a:any,b:any)=> (idx.get(a.id)??9999)-(idx.get(b.id)??9999)); }
  res.json(quests.map((q:any)=>serializeQuest(q)));
});

// Decline quest (transient)
app.post('/quests/:id/decline', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } });
  if(!quest) return res.status(404).json({ error:'Not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } });
  if(!board) return res.status(404).json({ error:'Board missing'});
  const member = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId: board.id, userId: req.userId! } } });
  if(!member && board.visibility!=='link') return res.status(403).json({ error:'Forbidden'});
  if(!declines[req.userId!]) declines[req.userId!] = new Set(); declines[req.userId!].add(id);
  res.status(204).end();
});

// Accept quest
app.post('/quests/:id/accept', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } });
  if(!quest) return res.status(404).json({ error:'Not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } });
  if(!board) return res.status(404).json({ error:'Board missing'});
  const member = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId: board.id, userId: req.userId! } } });
  if(!member && board.visibility!=='link') return res.status(403).json({ error:'Forbidden'});
  if(board.isLocked) return res.status(423).json({ error:'Board locked'});
  const { assignedToType='Player', assignedToId } = req.body || {};
  const targetId = assignedToType==='Player' ? (assignedToId || req.userId) : assignedToId;
  if(!targetId) return res.status(400).json({ error:'assignedToId required'});
  if(!quest.allowMultipleAccepts){
    const existing = await prisma.questAssignment.findFirst({ where:{ questId: quest.id, status:'Accepted' } });
    if(existing) return res.status(409).json({ error:'Already accepted'});
    await prisma.quest.update({ where:{ id: quest.id }, data:{ status:'Accepted' } });
  }
  const assignment = await prisma.questAssignment.create({ data:{ questId: quest.id, boardId: quest.boardId, assignedToType, assignedToId: targetId } });
  const freshQuest = await prisma.quest.findUnique({ where:{ id: quest.id } });
  const sQuest = serializeQuest(freshQuest);
  io.to(`board:${board.id}`).emit('quest:update', { type:'accepted', quest: sQuest, assignment });
  res.status(201).json({ assignment, quest: sQuest });
});

// Basic inventory (DB-backed)
app.get('/inventory', auth, async (req:AuthedReq,res)=>{
  const { boardId, assignedToId } = req.query as any;
  const where:any={}; if(boardId) where.boardId=boardId; if(assignedToId) where.assignedToId=assignedToId;
  const list = await prisma.questAssignment.findMany({ where });
  res.json(list);
});

// Utility membership helpers
async function membership(boardId:string, userId:string){
  return prisma.membership.findUnique({ where:{ boardId_userId:{ boardId, userId } } });
}
function assertDM(board:any, userId:string){ return board.dmId === userId; }

// Board PATCH (update basic fields)
app.patch('/boards/:id', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const { title, description, background, isLocked } = req.body || {};
  const board = await prisma.board.findUnique({ where:{ id } }); if(!board) return res.status(404).json({ error:'Not found'});
  if(!assertDM(board, req.userId!)) return res.status(403).json({ error:'Forbidden' });
  const updated = await prisma.board.update({ where:{ id }, data:{
    title: title ?? board.title,
    description: description === undefined ? board.description : description,
    background: background === undefined ? board.background : background,
    isLocked: typeof isLocked === 'boolean' ? isLocked : board.isLocked
  }});
  io.to(`board:${id}`).emit('board:update', { board: updated });
  res.json({ ...updated, questOrder: updated.questOrder? JSON.parse(updated.questOrder): undefined });
});

// Board invite
app.post('/boards/:id/invite', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const { emails } = req.body || {};
  if(!Array.isArray(emails) || !emails.length) return res.status(400).json({ error:'emails[] required'});
  const board = await prisma.board.findUnique({ where:{ id } }); if(!board) return res.status(404).json({ error:'Not found'});
  if(!assertDM(board, req.userId!)) return res.status(403).json({ error:'Forbidden'});
  const created:any[]=[];
  for(const email of emails){
    let user = await prisma.user.findUnique({ where:{ email }, include:{ roles:true } });
    if(!user){ user = await prisma.user.create({ data:{ email, passwordHash: bcrypt.hashSync(uuid(),6), displayName: email.split('@')[0], roles:{ create:{ role:'Player'} } }, include:{ roles:true } }); }
    const mem = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId:id, userId:user.id } } });
    if(!mem){ const newMem = await prisma.membership.create({ data:{ boardId:id, userId:user.id, role:'Player', invitedAt:new Date(), joinedAt:new Date() } }); created.push(newMem); }
  }
  res.json({ invited: created.length, memberships: created });
});

// Remove member
app.delete('/boards/:id/members/:userId', auth, async (req:AuthedReq,res)=>{
  const { id, userId } = req.params as any;
  const board = await prisma.board.findUnique({ where:{ id } }); if(!board) return res.status(404).json({ error:'Not found'});
  if(!assertDM(board, req.userId!)) return res.status(403).json({ error:'Forbidden'});
  const mem = await prisma.membership.findUnique({ where:{ boardId_userId:{ boardId:id, userId } } }); if(!mem) return res.status(404).json({ error:'membership not found'});
  if(mem.role==='DM') return res.status(400).json({ error:'Cannot remove DM'});
  await prisma.membership.delete({ where:{ id: mem.id } });
  res.json({ removed:true });
});

// Reorder quests
app.post('/boards/:id/reorder', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const { questIds } = req.body || {};
  if(!Array.isArray(questIds)) return res.status(400).json({ error:'questIds array required'});
  const board = await prisma.board.findUnique({ where:{ id }, include:{ quests:true } }); if(!board) return res.status(404).json({ error:'Not found'});
  if(!assertDM(board, req.userId!)) return res.status(403).json({ error:'Forbidden'});
  const valid = new Set(board.quests.filter((q:any)=>q.status!=='Archived').map((q:any)=>q.id));
  if(!questIds.every((q:string)=>valid.has(q))) return res.status(400).json({ error:'Invalid quest id in list'});
  await prisma.board.update({ where:{ id }, data:{ questOrder: JSON.stringify(questIds) } });
  io.to(`board:${id}`).emit('board:update', { boardId:id, type:'reorder', questOrder:questIds });
  res.json({ questOrder: questIds });
});

// Quest detail
app.get('/quests/:id', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } }); if(!quest) return res.status(404).json({ error:'Not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  const mem = await membership(board.id, req.userId!); if(!mem && board.visibility!=='link') return res.status(403).json({ error:'Forbidden'});
  res.json(serializeQuest(quest));
});

// Quest patch
app.patch('/quests/:id', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } }); if(!quest) return res.status(404).json({ error:'Not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  if(board.dmId !== req.userId && quest.createdById !== req.userId) return res.status(403).json({ error:'Forbidden'});
  const fields = ['title','summary','bodyMarkdown','difficulty','visibility','allowMultipleAccepts','status'] as const;
  const data:any = {};
  for(const f of fields){ if(req.body[f] !== undefined) data[f]= req.body[f]; }
  if(req.body.images) data.images = (req.body.images as string[]).join(',');
  if(req.body.tags) data.tags = (req.body.tags as string[]).join(',');
  if(req.body.rewards) data.rewardsJson = JSON.stringify(req.body.rewards);
  const updated = await prisma.quest.update({ where:{ id }, data });
  const sQuest = serializeQuest(updated);
  io.to(`board:${quest.boardId}`).emit('quest:update', { type:'updated', quest: sQuest });
  res.json(sQuest);
});

// Archive quest
app.post('/quests/:id/archive', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } }); if(!quest) return res.status(404).json({ error:'Not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  if(board.dmId !== req.userId) return res.status(403).json({ error:'Forbidden'});
  await prisma.quest.update({ where:{ id }, data:{ status:'Archived' } });
  io.to(`board:${quest.boardId}`).emit('quest:update', { type:'archived', questId: quest.id });
  res.json({ archived:true });
});

// Complete assignment
app.post('/assignments/:id/complete', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const assignment = await prisma.questAssignment.findUnique({ where:{ id } }); if(!assignment) return res.status(404).json({ error:'Assignment not found'});
  if(assignment.status!=='Accepted') return res.status(400).json({ error:'Not in Accepted state'});
  const quest = await prisma.quest.findUnique({ where:{ id: assignment.questId } }); if(!quest) return res.status(404).json({ error:'Quest missing'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  const mem = await membership(board.id, req.userId!); if(!mem) return res.status(403).json({ error:'Forbidden'});
  const { notes } = req.body || {};
  await prisma.questAssignment.update({ where:{ id }, data:{ status:'Completed', completedAt:new Date(), notes } });
  if(!quest.allowMultipleAccepts){ await prisma.quest.update({ where:{ id: quest.id }, data:{ status:'Completed' } }); }
  else {
    const remaining = await prisma.questAssignment.count({ where:{ questId: quest.id, status:'Accepted' } });
    if(remaining===0) await prisma.quest.update({ where:{ id: quest.id }, data:{ status:'Completed' } });
  }
  const finalQuest = await prisma.quest.findUnique({ where:{ id: quest.id } });
  const sQuest = serializeQuest(finalQuest);
  io.to(`board:${quest.boardId}`).emit('quest:update', { type:'completed', quest: sQuest });
  res.json({ completed:true });
});

// Abandon assignment
app.post('/assignments/:id/abandon', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const assignment = await prisma.questAssignment.findUnique({ where:{ id } }); if(!assignment) return res.status(404).json({ error:'Assignment not found'});
  if(assignment.status!=='Accepted') return res.status(400).json({ error:'Not in Accepted state'});
  const quest = await prisma.quest.findUnique({ where:{ id: assignment.questId } }); if(!quest) return res.status(404).json({ error:'Quest missing'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  const mem = await membership(board.id, req.userId!); if(!mem) return res.status(403).json({ error:'Forbidden'});
  await prisma.questAssignment.update({ where:{ id }, data:{ status:'Abandoned' } });
  if(!quest.allowMultipleAccepts){
    const still = await prisma.questAssignment.count({ where:{ questId: quest.id, status:'Accepted' } });
    if(still===0 && quest.status==='Accepted') await prisma.quest.update({ where:{ id: quest.id }, data:{ status:'Posted' } });
  }
  const updatedQuest = await prisma.quest.findUnique({ where:{ id: quest.id } });
  const sQuest = serializeQuest(updatedQuest);
  const assignmentUpdated = await prisma.questAssignment.findUnique({ where:{ id } });
  io.to(`board:${quest.boardId}`).emit('quest:update', { type:'abandoned', quest: sQuest, assignment: assignmentUpdated });
  res.json({ abandoned:true });
});

// Comments
app.get('/quests/:id/comments', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } }); if(!quest) return res.status(404).json({ error:'Quest not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  const mem = await membership(board.id, req.userId!); if(!mem) return res.status(403).json({ error:'Forbidden'});
  const list = await prisma.comment.findMany({ where:{ questId: quest.id }, orderBy:{ createdAt:'asc' } });
  res.json(list);
});
app.post('/quests/:id/comments', auth, async (req:AuthedReq,res)=>{
  const { id } = req.params; const quest = await prisma.quest.findUnique({ where:{ id } }); if(!quest) return res.status(404).json({ error:'Quest not found'});
  const board = await prisma.board.findUnique({ where:{ id: quest.boardId } }); if(!board) return res.status(404).json({ error:'Board missing'});
  const mem = await membership(board.id, req.userId!); if(!mem) return res.status(403).json({ error:'Forbidden'});
  const { bodyMarkdown, parentId } = req.body || {}; if(!bodyMarkdown) return res.status(400).json({ error:'bodyMarkdown required'});
  const comment = await prisma.comment.create({ data:{ questId: quest.id, authorId: req.userId!, bodyMarkdown, parentId } });
  io.to(`board:${quest.boardId}`).emit('comment:new', { comment });
  res.status(201).json(comment);
});

// Admin endpoints
app.get('/admin/users', auth, async (req:AuthedReq,res)=>{
  const u = await userWithRoles(req.userId!); if(!u) return res.status(401).json({ error:'User not found'});
  if(!u.roles.some((r:any)=>r.role==='Admin')) return res.status(403).json({ error:'Admin only'});
  const users = await prisma.user.findMany({ include:{ roles:true } });
  res.json(users.map(toUser));
});
app.post('/admin/promote', auth, async (req:AuthedReq,res)=>{
  const u = await userWithRoles(req.userId!); if(!u) return res.status(401).json({ error:'User not found'});
  if(!u.roles.some((r:any)=>r.role==='Admin')) return res.status(403).json({ error:'Admin only'});
  const { userId, role='Admin' } = req.body || {};
  if(!userId) return res.status(400).json({ error:'userId required'});
  const target = await prisma.user.findUnique({ where:{ id: userId }, include:{ roles:true } });
  if(!target) return res.status(404).json({ error:'User not found'});
  if(!target.roles.some((r:any)=>r.role===role)) await prisma.userRole.create({ data:{ userId: target.id, role } });
  const updated = await prisma.user.findUnique({ where:{ id: userId }, include:{ roles:true } });
  res.json({ id: updated!.id, roles: updated!.roles.map((r:any)=>r.role) });
});

(async ()=>{
  await ensureAdmin();
  server.listen(PORT, ()=> console.log(`[prisma-server] Listening on :${PORT}`));
})();
