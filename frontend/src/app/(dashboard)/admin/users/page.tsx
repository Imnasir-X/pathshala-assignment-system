'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch, apiPost, apiDelete, ApiErrorImpl } from '@/lib/api-client';
import type { User } from '@/lib/types';
import { toast } from 'sonner';

const roleBadgeStyles: Record<string, { bg: string; color: string }> = {
  Admin: { bg: 'var(--primary-light)', color: 'var(--primary)' },
  Teacher: { bg: 'var(--info-light)', color: 'var(--info)' },
  Student: { bg: 'var(--success-light)', color: 'var(--success)' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try { setUsers(await apiFetch<User[]>('/api/users?page=1&pageSize=50')); }
    catch { setError('Failed to load users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/users/${deleteTarget.id}`);
      toast.success(`User "${deleteTarget.fullName}" deleted successfully`);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast.error('Failed to delete user. Please try again.');
    }
  };

  if (loading)
    return (
      <div>
        <div className="h-8 w-48 skeleton rounded-lg mb-6" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-lg border" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>
        <p className="font-medium mb-2">{error}</p>
        <button onClick={fetchUsers} className="text-sm underline">Try again</button>
      </div>
    );

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>Manage teachers, students, and admins.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-md transition-shadow"
          style={{ background: 'var(--primary)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={showCreate ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
          </svg>
          {showCreate ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showCreate && <CreateUserForm onCreated={() => { setShowCreate(false); fetchUsers(); }} />}

      {/* Search bar */}
      {users.length > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-white" style={{ borderColor: 'var(--border)' }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs" style={{ color: 'var(--text-muted)' }}>Clear</button>
          )}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No users found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click "Add User" to create the first account.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b" style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)' }}>
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Email</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Role</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredUsers.map(u => {
                  const badge = roleBadgeStyles[u.role] || roleBadgeStyles.Student;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{u.fullName}</td>
                      <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: badge.bg, color: badge.color, borderColor: badge.color + '33' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => setDeleteTarget(u)}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                          style={{ color: 'var(--danger)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {search && filteredUsers.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users match "{search}"</div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--danger-light)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Delete user?</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This will permanently delete <strong>{deleteTarget.fullName}</strong>. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--danger)' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'Student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await apiPost('/api/users', form);
      toast.success(`User "${form.fullName}" created successfully`);
      onCreated();
    } catch (err) {
      const msg = err instanceof ApiErrorImpl ? err.detail : 'Failed to create user.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New User</h2>
      {error && <div className="p-3 rounded-lg border text-sm" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="text" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
            placeholder="name@edu.bd" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
            <option>Admin</option><option>Teacher</option><option>Student</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 hover:shadow-md transition-shadow"
          style={{ background: 'var(--primary)' }}>
          {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
