'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiPost, apiDelete, ApiErrorImpl } from '@/lib/api-client';
import type { Subject, ClassCourse } from '@/lib/types';
import { toast } from 'sonner';

export default function AdminSubjectsPage() {
  const [items, setItems] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', classCourseId: '' });
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [subs, cls] = await Promise.all([
        apiFetch<Subject[]>('/api/subjects?page=1&pageSize=50'),
        apiFetch<ClassCourse[]>('/api/classes?page=1&pageSize=50'),
      ]);
      setItems(subs); setClasses(cls);
    } catch { setError('Failed to load subjects.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await apiPost('/api/subjects', { name: form.name, code: form.code || undefined, classCourseId: Number(form.classCourseId) }); setShowCreate(false); setForm({ name: '', code: '', classCourseId: '' }); fetchData(); }
    catch (err) { toast.error(err instanceof ApiErrorImpl ? err.detail : 'Failed.'); }
  };

  const confirmDelete = async (id: number) => {
    try {
      await apiDelete(`/api/subjects/${id}`);
      setDeleteTarget(null);
      fetchData();
      toast.success('Subject deleted successfully');
    } catch (err) {
      const msg = err instanceof ApiErrorImpl ? err.detail : 'Failed to delete subject.';
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="h-64 skeleton rounded-lg" />;
  if (error) return <div className="p-4 rounded-lg border" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}><p className="font-medium mb-2">{error}</p><button onClick={fetchData} className="text-sm underline">Try again</button></div>;

  const className = (id: number) => classes.find(c => c.id === id)?.name || `#${id}`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Subjects</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ background: 'var(--accent)' }}>{showCreate ? 'Cancel' : '+ Add Subject'}</button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Name</label><input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }} /></div>
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Code</label><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }} /></div>
          <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Class</label>
            <select required value={form.classCourseId} onChange={e => setForm({ ...form, classCourseId: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-lg" style={{ borderColor: 'var(--border-strong)' }}><option value="">Select...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="sm:col-span-3"><button type="submit" className="px-5 py-2.5 text-white rounded-lg font-medium" style={{ background: 'var(--accent)' }}>Create</button></div>
        </form>
      )}
      {items.length === 0 ? <div className="text-center py-16"><p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No subjects found</p></div> : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm"><thead className="border-b border-slate-200" style={{ background: 'var(--surface-muted)' }}><tr><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Code</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Class</th><th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map(s => <tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</td><td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{s.code || '—'}</td><td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{className(s.classCourseId)}</td><td className="px-4 py-3"><button onClick={() => setDeleteTarget(s)} className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Delete</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete subject?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>This will permanently delete "{deleteTarget.name}".</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>Cancel</button><button onClick={() => confirmDelete(deleteTarget.id)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--danger)' }}>Delete</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
