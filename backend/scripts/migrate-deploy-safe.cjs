#!/usr/bin/env node
/**
 * Safe Prisma migrate deploy.
 * Ensures DATABASE_URL is set (fallback to SQLite file) so Render deploys don't fail
 * when the env var is accidentally omitted. Fallback is only applied if missing/empty.
 */
const { execSync } = require('child_process');

if(!process.env.DATABASE_URL){
  const fallback = 'file:./prisma/dev.db';
  process.env.DATABASE_URL = fallback;
  console.log(`[migrate-safe] DATABASE_URL missing. Using fallback: ${fallback}`);
}
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} catch (e) {
  console.error('[migrate-safe] Migration deploy failed');
  process.exit(e.status || 1);
}

