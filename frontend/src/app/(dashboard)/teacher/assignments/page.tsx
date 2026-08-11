'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, apiPost, apiDelete, ApiErrorImpl } from '@/lib/api-client';
import type { Assignment } from '@/lib/types';
import { toast } from 'sonner';
import { PageHeader, EmptyState, Alert, StatusBadge } from '@/components/ui';

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      setAssignments(await apiFetch<Assignment[]>('/api/assignments?page=1&pageSize=50'));
    } catch {
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/assignments/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast.success('Assignment deleted');
      fetchAssignments();
    } catch {
      toast.error('Failed to delete assignment.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-7 w-48 skeleton mb-4" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-[var(--radius)]" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <p className="font-medium mb-1">{error}</p>
        <button onClick={fetchAssignments} className="underline text-sm">Try again</button>
      </Alert>
    );
  }

  const published = assignments.filter(a => a.status === 'Published').length;
  const drafts = assignments.filter(a => a.status === 'Draft').length;

  return (
    <div>
      <PageHeader
        title="Assignments"
        description={`${published} published · ${drafts} draft${drafts !== 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={showCreate ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showCreate ? 'Cancel' : 'New assignment'}
          </button>
        }
      />

      {showCreate && (
        <CreateAssignmentForm
          onCreated={() => {
            setShowCreate(false);
            fetchAssignments();
            toast.success('Assignment created');
          }}
        />
      )}

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Create a draft or publish work for one of your linked classes."
          action={
            !showCreate ? (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                New assignment
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const isPastDeadline = new Date(a.deadline) <= new Date();
            const rowClass =
              a.status === 'Draft'
                ? 'list-row list-row-draft'
                : isPastDeadline
                  ? 'list-row list-row-past'
                  : 'list-row list-row-published';
            return (
              <div key={a.id} className={rowClass}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-[0.95rem] text-stone-900 truncate">{a.title}</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-stone-600">
                    {a.subjectName}
                    <span className="text-stone-400"> · </span>
                    {a.className}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-stone-500">
                    <span>Max {a.maxMarks} marks</span>
                    <span className={isPastDeadline && a.status === 'Published' ? 'text-red-700 font-medium' : ''}>
                      {isPastDeadline && a.status === 'Published'
                        ? 'Deadline passed'
                        : `Due ${new Date(a.deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/teacher/assignments/${a.id}/submissions`} className="btn btn-secondary text-xs">
                    Submissions
                  </Link>
                  <button onClick={() => setDeleteTarget(a)} className="btn btn-danger text-xs">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="panel max-w-md w-full p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-900 mb-1">Delete assignment?</h3>
            <p className="text-sm text-stone-600 mb-1">
              This permanently removes “{deleteTarget.title}” and all related submissions.
            </p>
            <p className="text-xs text-stone-400 mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={confirmDelete} className="btn btn-primary" style={{ background: 'var(--danger)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAssignmentForm({ onCreated }: { onCreated: () => void }) {
  const [tsaList, setTsaList] = useState<{ id: number; subjectName: string; className: string }[]>([]);
  const [tsaLoading, setTsaLoading] = useState(true);
  const [tsaError, setTsaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', teacherSubjectAssignmentId: '',
    deadline: '', maxMarks: '100', status: 'Draft',
  });

  useEffect(() => {
    setTsaLoading(true);
    setTsaError(null);
    apiFetch<{ id: number; subjectName: string; classCourseName: string }[]>('/api/teacher-assignments?page=1&pageSize=50')
      .then(data => {
        setTsaList(data.map(d => ({ id: d.id, subjectName: d.subjectName, className: d.classCourseName })));
        if (data.length === 0) {
          setTsaError('No class + subject links yet. Ask an admin to assign you first.');
        }
      })
      .catch((err) => {
        setTsaError(err instanceof ApiErrorImpl ? err.detail : 'Failed to load class + subject list.');
      })
      .finally(() => setTsaLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/assignments', {
        title: form.title,
        description: form.description || undefined,
        teacherSubjectAssignmentId: Number(form.teacherSubjectAssignmentId),
        deadline: new Date(form.deadline).toISOString(),
        maxMarks: Number(form.maxMarks),
        status: form.status,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiErrorImpl ? err.detail : 'Failed to create assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel p-5 mb-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">New assignment</h2>
        <p className="text-xs text-stone-500 mt-0.5">Drafts stay private until you publish.</p>
      </div>
      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block mb-1.5">Title</label>
          <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="field" placeholder="e.g. Chapter 3 problem set" />
        </div>
        <div>
          <label className="block mb-1.5">Description <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
            className="field resize-y min-h-[4.5rem]" placeholder="Instructions for students…" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1.5">Class + subject</label>
          <select required value={form.teacherSubjectAssignmentId}
            onChange={e => setForm({ ...form, teacherSubjectAssignmentId: e.target.value })}
            disabled={tsaLoading || tsaList.length === 0}
            className="field">
            <option value="">{tsaLoading ? 'Loading…' : 'Select…'}</option>
            {tsaList.map(t => (
              <option key={t.id} value={t.id}>{t.subjectName} — {t.className}</option>
            ))}
          </select>
          {tsaError && <p className="text-xs text-red-700 mt-1.5">{tsaError}</p>}
        </div>
        <div>
          <label className="block mb-1.5">Deadline</label>
          <input type="datetime-local" required value={form.deadline}
            onChange={e => setForm({ ...form, deadline: e.target.value })} className="field" />
        </div>
        <div>
          <label className="block mb-1.5">Max marks</label>
          <input type="number" required min="1" value={form.maxMarks}
            onChange={e => setForm({ ...form, maxMarks: e.target.value })} className="field" />
        </div>
        <div>
          <label className="block mb-1.5">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="field">
            <option value="Draft">Save as draft</option>
            <option value="Published">Publish now</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? 'Creating…' : 'Create assignment'}
      </button>
    </form>
  );
}
