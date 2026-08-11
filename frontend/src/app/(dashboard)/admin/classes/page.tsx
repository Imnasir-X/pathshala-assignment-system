'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiPost, apiDelete, ApiErrorImpl } from '@/lib/api-client';
import type { ClassCourse } from '@/lib/types';
import { toast } from 'sonner';

export default function AdminClassesPage() {
  const [items, setItems] = useState<ClassCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', section: '', academicYear: '' });
  const [deleteTarget, setDeleteTarget] = useState<ClassCourse | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try { setItems(await apiFetch<ClassCourse[]>('/api/classes?page=1&pageSize=50')); }
    catch { setError('Failed to load classes.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await apiPost('/api/classes', { name: form.name, section: form.section || undefined, academicYear: form.academicYear || undefined }); setForm({ name: '', section: '', academicYear: '' }); setShowCreate(false); fetchData(); }
    catch (err) { toast.error(err instanceof ApiErrorImpl ? err.detail : 'Failed.'); }
  };

  const confirmDelete = async (id: number) => {
    try {
      await apiDelete(`/api/classes/${id}`);
      setDeleteTarget(null);
      fetchData();
      toast.success('Class deleted successfully');
    } catch (err) {
      const msg = err instanceof ApiErrorImpl ? err.detail : 'Failed to delete class.';
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="h-64 skeleton rounded-lg" />;
  if (error) return <div className="p-4 rounded-lg border" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}><p className="font-medium mb-2">{error}</p><button onClick={fetchData} className="text-sm underline">Try again</button></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Classes</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ background: 'var(--accent)' }}>{showCreate ? 'Cancel' : '+ Add Class'}</button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Name</label><input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }} /></div>
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Section</label><input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }} /></div>
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Academic Year</label><input type="text" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }} /></div>
          <div className="sm:col-span-3"><button type="submit" className="px-5 py-2.5 text-white rounded-lg font-medium" style={{ background: 'var(--accent)' }}>Create</button></div>
        </form>
      )}
      {items.length === 0 ? <div className="text-center py-16"><p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No classes found</p></div> : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm"><thead className="border-b border-slate-200" style={{ background: 'var(--surface-muted)' }}><tr><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Section</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Year</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td><td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.section || '—'}</td><td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.academicYear || '—'}</td><td className="px-4 py-3"><button onClick={() => setDeleteTarget(c)} className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Delete</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete class?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>This will permanently delete "{deleteTarget.name}" and related data.</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>Cancel</button><button onClick={() => confirmDelete(deleteTarget.id)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--danger)' }}>Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
