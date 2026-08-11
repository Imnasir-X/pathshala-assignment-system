'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { apiFetch, apiPut, ApiErrorImpl } from '@/lib/api-client';
import type { Submission, Assignment } from '@/lib/types';

export default function GradingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, a] = await Promise.all([
        apiFetch<Submission[]>(`/api/assignments/${id}/submissions?page=1&pageSize=50`),
        apiFetch<Assignment>(`/api/assignments/${id}`),
      ]);
      setSubmissions(subs);
      setAssignment(a);
    } catch (err) {
      setError(err instanceof ApiErrorImpl ? err.detail : 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-32 skeleton rounded-lg" />)}
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-lg border" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>
        <p className="font-medium mb-2">{error}</p>
        <button onClick={fetchData} className="text-sm underline">Try again</button>
      </div>
    );

  return (
    <div>
      <Link href="/teacher/assignments" className="text-sm mb-4 inline-flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
        ← Back to assignments
      </Link>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {assignment?.title || `Assignment #${id}`}
      </h1>
      {assignment && (
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {assignment.subjectName} · {assignment.className} · Max Marks: {assignment.maxMarks}
        </p>
      )}

      {submissions.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No submissions yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Submissions will appear here once students start submitting.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {submissions.map((s) => (
            <GradingCard key={s.id} submission={s} maxMarks={assignment?.maxMarks || 100} />
          ))}
        </div>
      )}
    </div>
  );
}

function GradingCard({ submission, maxMarks }: { submission: Submission; maxMarks: number }) {
  const [marks, setMarks] = useState(submission.marks?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGrade = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPut<Submission>(`/api/submissions/${submission.id}/grade`, {
        marks: Number(marks),
        feedback: feedback || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiErrorImpl ? err.detail : 'Failed to grade.');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnRevision = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPut<Submission>(`/api/submissions/${submission.id}/status`, { status: 'ReturnedForRevision' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiErrorImpl ? err.detail : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{submission.studentName}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Submitted: {new Date(submission.submittedAt).toLocaleString()}
          </p>
          {submission.updatedAt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated: {new Date(submission.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
          background: submission.status === 'Graded' ? 'var(--success-light)' : 'var(--accent-light)',
          color: submission.status === 'Graded' ? 'var(--success)' : 'var(--accent)'
        }}>
          {submission.status}
        </span>
      </div>

      <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--surface-muted)' }}>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Student's Answer</p>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{submission.content}</p>
      </div>

      {submission.status === 'Graded' && submission.marks != null && (
        <div className="mb-3 p-3 rounded-lg" style={{ background: 'var(--success-light)' }}>
          <p className="text-sm" style={{ color: 'var(--success)' }}>
            <span className="font-bold">{submission.marks}</span> / {maxMarks} marks
            {submission.feedback && <span className="block mt-1" style={{ color: 'var(--text-secondary)' }}>Feedback: {submission.feedback}</span>}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 p-2.5 rounded-lg border text-sm" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>{error}</div>
      )}
      {success && (
        <div className="mb-3 p-2.5 rounded-lg border text-sm flex items-center gap-2" style={{ background: 'var(--success-light)', borderColor: '#bbf7d0', color: 'var(--success)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Graded successfully.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Marks (max: {maxMarks})
          </label>
          <input type="number" min="0" max={maxMarks} value={marks} onChange={e => setMarks(e.target.value)}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Feedback</label>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2}
            className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }} />
        </div>
      </div>
      <button onClick={handleGrade} disabled={saving || marks === ''}
        className="mt-3 px-5 py-2 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-md transition-shadow"
        style={{ background: 'var(--accent)' }}>
        {saving ? 'Saving...' : 'Save Grade'}
      </button>
      {submission.status !== 'ReturnedForRevision' && (
        <button onClick={handleReturnRevision} disabled={saving}
          className="mt-3 ml-2 px-5 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm border hover:shadow-md transition-shadow"
          style={{ borderColor: 'var(--warning)', color: 'var(--warning)', background: 'var(--warning-light)' }}>
          Return for Revision
        </button>
      )}
    </div>
  );
}
