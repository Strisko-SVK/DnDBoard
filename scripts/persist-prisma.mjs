#!/usr/bin/env node
/*
  Persistence verification script for Prisma-backed server.
  Steps:
   1. Ensure prisma server (port 4100) is running (health check). If not, start it (PERSISTENCE=prisma, node dist/start.js).
   2. Register a random user and create a board + quest.
   3. Capture boardId + questId.
   4. Stop server if we started it.
   5. Restart server.
   6. Fetch board & its quests again to ensure quest still exists (persistence success).
*/
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const BASE = 'http://localhost:4100';
let started = false;
let proc = null;

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fetchJson(url, opts={}){
  const res = await fetch(url,{ ...opts, headers:{ 'Content-Type':'application/json', ...(opts.headers||{}) }});
  if(!res.ok){ const text = await res.text(); throw new Error(`HTTP ${res.status} ${res.statusText} => ${text}`); }
  if(res.status===204) return null; return res.json();
}
async function ensureServer(){
  try { await fetchJson(`${BASE}/health`); return; } catch {}
  console.log('[persist] Starting prisma server...');
  started = true;
  proc = spawn('node', ['dist/start.js'], { cwd: 'backend', env:{ ...process.env, PORT:'4100', PERSISTENCE:'prisma' }, stdio:'inherit' });
  for(let i=0;i<30;i++){ try { await fetchJson(`${BASE}/health`); return; } catch { await wait(300); } }
  throw new Error('Server failed to start');
}
async function stopServer(){ if(started && proc){ proc.kill('SIGINT'); await wait(500); } }

function randEmail(){ return `persist_${Date.now()}_${crypto.randomBytes(2).toString('hex')}@example.com`; }

async function main(){
  const email = randEmail();
  await ensureServer();
  console.log('[persist] Registering user');
  const reg = await fetchJson(`${BASE}/auth/register`, { method:'POST', body: JSON.stringify({ email, password:'pass123', displayName:'PersistUser' })});
  const token = reg.accessToken;
  console.log('[persist] Creating board');
  const board = await fetchJson(`${BASE}/boards`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ title:'Persist Board' })});
  console.log('[persist] Creating quest');
  const quest = await fetchJson(`${BASE}/boards/${board.id}/quests`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ title:'Persist Quest', summary:'Should survive restart', bodyMarkdown:'Persistence body' })});
  await stopServer();
  // restart
  started = false; proc = null;
  await ensureServer();
  console.log('[persist] Verifying persistence after restart');
  const login = await fetchJson(`${BASE}/auth/login`, { method:'POST', body: JSON.stringify({ email, password:'pass123' })});
  const token2 = login.accessToken;
  const quests = await fetchJson(`${BASE}/boards/${board.id}/quests`, { headers:{ Authorization:`Bearer ${token2}` }});
  if(!Array.isArray(quests) || !quests.find(q=>q.id===quest.id)) throw new Error('Quest missing after restart');
  console.log('[persist] SUCCESS: Quest still present after restart.');
  await stopServer();
}

main().catch(err=>{ console.error('[persist] FAILURE', err); process.exit(1); });

