"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/auth';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAPI } from '../../../lib/api';
import { User, Role } from '@dndboard/shared';

export default function AdminUsersPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [promoteRole, setPromoteRole] = useState<Role>('DM');
  const { data: users = [], error, isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: AdminAPI.users,
    enabled: !!token
  });
  const promoteMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role?: string }) => AdminAPI.promote(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  });

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token, router]);

  if (!token) return <div className="p-6 text-sm text-parchment">Redirecting...</div>;
  if (!user?.roles?.includes('Admin')) return (
    <div className="min-h-screen bg-oak flex items-center justify-center">
      <div className="card text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="font-display text-2xl font-bold text-ink mb-2">Access Denied</h2>
        <p className="text-ink/60 mb-4">This area is restricted to Administrators only.</p>
        <button className="btn-primary" onClick={() => router.push('/')}>
          Return to Boards
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-oak">
      {/* Toolbar Header */}
      <div className="toolbar px-6 py-4">
        <div className="flex items-center gap-4">
          <button className="btn-outline text-xs px-3 py-1.5" onClick={() => router.push('/')}>
            ← Back to Boards
          </button>
          <h1 className="font-display text-3xl font-bold text-parchment flex items-center gap-2">
            <span>⚙️</span>
            <span>User Management</span>
          </h1>
          <div className="ml-auto text-parchment-aged text-sm">
            👑 Admin Panel
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        <div className="card max-w-6xl mx-auto space-y-4">
          {/* Controls */}
          <div className="flex gap-3 items-center pb-4 border-b border-ink/10">
            <label className="text-sm font-medium text-ink">Default Promote Role:</label>
            <select
              className="input w-auto bg-parchment-light"
              value={promoteRole}
              onChange={e => setPromoteRole(e.target.value as Role)}
            >
              {['Admin', 'DM', 'Player'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Loading/Error States */}
          {isLoading && (
            <div className="text-center text-ink/60 py-8">
              <div className="text-4xl mb-2">⏳</div>
              <div>Loading users...</div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-crimson/10 border border-crimson/30 text-crimson text-sm">
              Error loading users
            </div>
          )}

          {/* Users Table */}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-ink/20 rounded-lg overflow-hidden">
                <thead className="bg-parchment-aged">
                  <tr>
                    <th className="p-3 text-left font-display font-bold text-ink">Email</th>
                    <th className="p-3 text-left font-display font-bold text-ink">Display Name</th>
                    <th className="p-3 text-left font-display font-bold text-ink">Roles</th>
                    <th className="p-3 text-right font-display font-bold text-ink">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-parchment">
                  {users.map((u: User) => (
                    <tr key={u.id} className="border-t border-ink/10 hover:bg-parchment-aged transition">
                      <td className="p-3 break-all align-top text-ink">{u.email}</td>
                      <td className="p-3 align-top text-ink font-medium">{u.displayName}</td>
                      <td className="p-3 align-top">
                        <div className="flex gap-1 flex-wrap">
                          {u.roles.map((r: Role) => (
                            <span key={r} className="badge">
                              {r === 'Admin' && '👑 '}
                              {r === 'DM' && '🎲 '}
                              {r === 'Player' && '⚔️ '}
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 align-top text-right">
                        {!u.roles.includes(promoteRole) && (
                          <button
                            disabled={promoteMutation.isPending}
                            onClick={() => promoteMutation.mutate({ userId: u.id, role: promoteRole })}
                            className="btn-primary text-xs"
                          >
                            {promoteMutation.isPending ? '...' : `+ Promote to ${promoteRole}`}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !isLoading && (
                    <tr>
                      <td className="p-8 text-center text-ink/60 italic" colSpan={4}>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
