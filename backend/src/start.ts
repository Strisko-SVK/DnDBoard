// Feature flag launcher for backend persistence mode.
// Usage: PERSISTENCE=prisma ts-node-dev src/start.ts  (Prisma-backed)
//        (default) ts-node-dev src/start.ts          (In-memory)

const mode = process.env.PERSISTENCE?.toLowerCase();
if(mode === 'prisma') {
  console.log('[start] Launching Prisma persistence server (server-prisma.ts)');
  require('./server-prisma');
} else {
  console.log('[start] Launching legacy in-memory server (index.ts)');
  require('./index');
}

