'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiPost, apiDelete, ApiErrorImpl } from '@/lib/api-client';
import type { TeacherSubjectAssignment as TSA, User, ClassCourse, Subject } from '@/lib/types';
import { toast } from 'sonner';
import { PageHeader, EmptyState, Alert } from '@/components/ui';

export default function AdminTeacherAssignmentsPage() {
  const [items, setItems] = useState<TSA[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassCourse[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ teacherId: '', subjectId: '', classCourseId: '' });
  const [deleteTarget, setDeleteTarget] = useState<TSA | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tsas, users, cls, subs] = await Promise.all([
        apiFetch<TSA[]>('/api/teacher-assignments?page=1&pageSize=50'),
        apiFetch<User[]>('/api/users?page=1&pageSize=50'),
        apiFetch<ClassCourse[]>('/api/classes?page=1&pageSize=50'),
        apiFetch<Subject[]>('/api/subjects?page=1&pageSize=50'),
      ]);
      setItems(tsas);
      setTeachers(users.filter(u => u.role === 'Teacher'));
      setClasses(cls);
      setSubjects(subs);
    } catch (err) {
      const msg = err instanceof ApiErrorImpl
        ? `${err.detail} (${err.status})`
        : err instanceof Error
          ? err.message
          : 'Failed to load teacher links.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/api/teacher-assignments', {
        teacherId: Number(form.teacherId),
        subjectId: Number(form.subjectId),
        classCourseId: Number(form.classCourseId),
      });
      setShowCreate(false);
      setForm({ teacherId: '', subjectId: '', classCourseId: '' });
      toast.success('Teacher linked to class + subject');
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiErrorImpl ? err.detail : 'Failed to create link.');
    }
  };

  const confirmDelete = async (id: number) => {
    try {
      await apiDelete(`/api/teacher-assignments/${id}`);
      setDeleteTarget(null);
      toast.success('Link removed');
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiErrorImpl ? err.detail : 'Failed to delete.');
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="h-48 skeleton rounded-[var(--radius)]" />;
  if (error) {
    return (
      <Alert>
        <p className="font-medium mb-1">{error}</p>
        <button onClick={fetchData} className="underline text-sm">Try again</button>
      </Alert>
    );
  }

  return (
    <div>
      <PageHeader
        title="Teacher links"
        description="Connect teachers to a class and subject so they can publish work."
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={showCreate ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showCreate ? 'Cancel' : 'Link teacher'}
          </button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="panel p-5 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block mb-1.5">Teacher</label>
            <select required value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className="field">
              <option value="">Select…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5">Subject</label>
            <select required value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} className="field">
              <option value="">Select…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1.5">Class</label>
            <select required value={form.classCourseId} onChange={e => setForm({ ...form, classCourseId: e.target.value })} className="field">
              <option value="">Select…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn btn-primary">Assign</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No teacher links"
          description="Link a teacher to a class and subject before they can create assignments."
          action={
            !showCreate ? (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary">Link teacher</button>
            ) : undefined
          }
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id}>
                  <td className="font-medium text-stone-900">{t.teacherName}</td>
                  <td>{t.subjectName}</td>
                  <td>{t.classCourseName}</td>
                  <td>
                    <button onClick={() => setDeleteTarget(t)} className="btn btn-danger text-xs py-1 px-2">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="panel max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">Remove teacher link?</h3>
            <p className="text-sm text-stone-600 mb-5">
              Unassign {deleteTarget.teacherName} from {deleteTarget.subjectName} — {deleteTarget.classCourseName}.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => confirmDelete(deleteTarget.id)} className="btn btn-primary" style={{ background: 'var(--danger)' }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
