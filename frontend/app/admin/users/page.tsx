"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/auth';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAPI } from '../../../lib/api';
import { User, Role } from '@dndboard/shared';

export default function AdminUsersPage(){
  const { token, user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [promoteRole,setPromoteRole]=useState<Role>('DM');
  const { data: users=[], error, isLoading } = useQuery<User[]>({ queryKey:['admin','users'], queryFn: AdminAPI.users, enabled: !!token });
  const promoteMutation = useMutation({ mutationFn: ({ userId, role }:{userId:string;role?:string}) => AdminAPI.promote(userId, role), onSuccess: ()=> qc.invalidateQueries({queryKey:['admin','users']}) });

  useEffect(()=>{ if(!token){ router.replace('/login'); } }, [token, router]);
  if(!token) return <div className="p-6 text-sm">Redirecting...</div>;
  if(!user?.roles?.includes('Admin')) return <div className="p-6">Forbidden (Admin only)</div>;

  return <div className="p-6 space-y-6">
    <div className="flex items-center gap-3">
      <button className="btn-outline text-xs" onClick={()=>router.push('/')}>← Back</button>
      <h1 className="text-2xl font-display font-bold">Admin / Users</h1>
    </div>
    <div className="card space-y-2">
      <div className="flex gap-2 items-center text-xs">
        <label className="font-medium">Default Promote Role</label>
        <select className="input w-auto" value={promoteRole} onChange={e=>setPromoteRole(e.target.value as Role)}>
          {['Admin','DM','Player'].map(r=> <option key={r}>{r}</option>)}
        </select>
      </div>
      {isLoading && <div className="text-sm">Loading users...</div>}
      {error && <div className="text-sm text-red-600">Error loading users</div>}
      <table className="w-full text-xs border border-ink/20 rounded overflow-hidden">
        <thead className="bg-ink/10">
          <tr>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Display</th>
            <th className="p-2 text-left">Roles</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u:User)=> <tr key={u.id} className="border-t border-ink/10">
            <td className="p-2 break-all align-top">{u.email}</td>
            <td className="p-2 align-top">{u.displayName}</td>
            <td className="p-2 align-top"><div className="flex gap-1 flex-wrap">{u.roles.map((r:Role)=><span key={r} className="badge">{r}</span>)}</div></td>
            <td className="p-2 align-top text-right">
              {!u.roles.includes(promoteRole) && <button disabled={promoteMutation.isPending} onClick={()=>promoteMutation.mutate({userId:u.id,role:promoteRole})} className="btn-outline text-[10px]">+ {promoteRole}</button>}
            </td>
          </tr>)}
          {users.length===0 && !isLoading && <tr><td className="p-4 text-center opacity-60" colSpan={4}>No users</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
