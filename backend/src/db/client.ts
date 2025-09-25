import { PrismaClient } from '@prisma/client';

// Single Prisma client instance (avoid hot reload duplication with ts-node-dev)
const globalForPrisma = globalThis as any; // eslint-disable-line @typescript-eslint/no-explicit-any
export const prisma: PrismaClient = globalForPrisma.__PRISMA__ || (globalForPrisma.__PRISMA__ = new PrismaClient());

export async function getUserWithRolesByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, include: { roles: true } });
}

export function rolesArray(user: { roles: { role: string }[] }) { return user.roles.map(r => r.role); }
