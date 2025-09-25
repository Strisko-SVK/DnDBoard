#!/usr/bin/env node
/*
  Smoke test script for DnD Board backend.
  Steps:
   1. Ensure backend running (try /health). If not, start it (temporary child process).
   2. Register a random user & login (capture token).
   3. Create board, create quest, accept quest, comment, complete quest, abandon (expect failure after complete), list quests includeDeclined.
   4. Login as admin and list users.
   5. Print summary and exit 0 on success; non‑zero on any failure.
*/

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
let startedBackend = false;
let backendProc = null;

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fetchJson(url, opts={}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } });
  if(!res.ok){
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} => ${body}`);
  }
  if(res.status===204) return null;
  return res.json();
}
async function ensureBackend() {
  try {
    await fetchJson(`${BASE}/health`);
    return;
  } catch (e) {
    console.log('[smoke] Backend not responding, starting local instance...');
    startedBackend = true;
    const isPrisma = BASE.includes(':4100');
    const args = isPrisma ? ['dist/start.js'] : ['dist/index.js'];
    const env = { ...process.env };
    if (isPrisma) { env.PERSISTENCE = 'prisma'; env.PORT = '4100'; }
    backendProc = spawn('node', args, { stdio: 'inherit', cwd: 'backend', env });
    for (let i=0;i<30;i++) {
      try { await fetchJson(`${BASE}/health`); return; } catch { await wait(250); }
    }
    throw new Error('Backend failed to start');
  }
}

function randEmail(){ return `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}@example.com`; }

async function main(){
  const summary = { steps: [] };
  try {
    await ensureBackend();
    summary.steps.push('backend_up');
    const email = randEmail();
    const reg = await fetchJson(`${BASE}/auth/register`, { method:'POST', body: JSON.stringify({ email, password:'pass123', displayName:'SmokeUser' })});
    summary.user = reg.user.id;
    summary.steps.push('registered');
    const token = reg.accessToken;

    const board = await fetchJson(`${BASE}/boards`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ title:'Smoke Board' })});
    summary.board = board.id; summary.steps.push('board_created');

    const quest = await fetchJson(`${BASE}/boards/${board.id}/quests`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ title:'Smoke Quest', summary:'Test summary', difficulty:'Easy' })});
    summary.quest = quest.id; summary.steps.push('quest_created');

    const accept = await fetchJson(`${BASE}/quests/${quest.id}/accept`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({})});
    summary.assignment = accept.assignment.id; summary.steps.push('quest_accepted');

    const comment = await fetchJson(`${BASE}/quests/${quest.id}/comments`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ bodyMarkdown:'Smoke comment' })});
    summary.comment = comment.id; summary.steps.push('comment_created');

    await fetchJson(`${BASE}/assignments/${accept.assignment.id}/complete`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({ notes:'Done' })});
    summary.steps.push('assignment_completed');

    // Attempt abandon after completion (should 400) – ignore error success criteria
    let abandonOk = false;
    try {
      await fetchJson(`${BASE}/assignments/${accept.assignment.id}/abandon`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: JSON.stringify({})});
    } catch {
      abandonOk = true; // expected
    }
    if(!abandonOk) throw new Error('Abandon unexpectedly succeeded after completion');
    summary.steps.push('abandon_rejected');

    // Include declined parameter check
    await fetchJson(`${BASE}/boards/${board.id}/quests?includeDeclined=true`, { headers:{ Authorization:`Bearer ${token}` }});
    summary.steps.push('quests_listed');

    // Admin login & list users
    const adminLogin = await fetchJson(`${BASE}/auth/login`, { method:'POST', body: JSON.stringify({ email: process.env.ADMIN_EMAIL || 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'admin123' })});
    const adminUsers = await fetchJson(`${BASE}/admin/users`, { headers:{ Authorization:`Bearer ${adminLogin.accessToken}` }});
    if(!Array.isArray(adminUsers) || adminUsers.length === 0) throw new Error('Admin users list empty');
    summary.steps.push('admin_users_listed');

    console.log('\n[smoke] SUCCESS');
    console.table(summary.steps.map((s,i)=>({ order:i, step:s })));
    process.exit(0);
  } catch (err) {
    console.error('\n[smoke] FAILURE:', err.message);
    console.error(summary);
    process.exit(1);
  } finally {
    if (startedBackend && backendProc) backendProc.kill('SIGINT');
  }
}

main();
