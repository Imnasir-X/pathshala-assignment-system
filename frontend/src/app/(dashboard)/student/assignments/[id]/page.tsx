'use client';

import { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { apiFetch, apiPost, apiPut, ApiErrorImpl } from '@/lib/api-client';
import type { Assignment, Submission } from '@/lib/types';
import { toast } from 'sonner';

export default function StudentAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const initialContent = useRef('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const a = await apiFetch<Assignment>(`/api/assignments/${id}`);
      setAssignment(a);
      const subs = await apiFetch<Submission[]>('/api/submissions/mine?page=1&pageSize=50');
      const existing = subs.find(s => s.assignmentId === Number(id));
      if (existing) {
        setSubmission(existing);
        setContent(existing.content);
        initialContent.current = existing.content;
      }
    } catch (err) {
      setError(err instanceof ApiErrorImpl ? err.detail : 'Failed to load assignment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleContentChange = (val: string) => {
    setContent(val);
    setHasChanges(val !== initialContent.current);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (submission) {
        const updated = await apiPut<Submission>(`/api/submissions/${submission.id}`, { content });
        setSubmission(updated);
        initialContent.current = content;
        setHasChanges(false);
        toast.success('Submission updated successfully');
      } else {
        const created = await apiPost<Submission>(`/api/submissions/${id}`, { content });
        setSubmission(created);
        initialContent.current = content;
        setHasChanges(false);
        toast.success('Assignment submitted successfully');
      }
    } catch (err) {
      const msg = err instanceof ApiErrorImpl ? err.detail : 'Failed to submit.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-40 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-lg border" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>
        <p className="font-medium mb-2">{error}</p>
        <button onClick={fetchData} className="text-sm underline">Try again</button>
      </div>
    );
  if (!assignment)
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Assignment not found</p>
        <Link href="/student/assignments" className="text-sm mt-2 inline-block" style={{ color: 'var(--primary)' }}>← Back to assignments</Link>
      </div>
    );

  const isPastDeadline = new Date(assignment.deadline) <= new Date();
  const isGraded = submission?.status === 'Graded';
  const canSubmit = !isPastDeadline && !isGraded;

  return (
    <div className="max-w-3xl">
      <Link href="/student/assignments" className="text-sm mb-4 inline-flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
        ← Back to assignments
      </Link>

      {/* Assignment details */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{assignment.title}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{assignment.subjectName} · {assignment.className}</p>
        {assignment.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Description</p>
            <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{assignment.description}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="px-3 py-1 rounded-full font-medium" style={{
            background: isPastDeadline ? 'var(--danger-light)' : 'var(--primary-light)',
            color: isPastDeadline ? 'var(--danger)' : 'var(--primary)'
          }}>
            {isPastDeadline ? 'Deadline Passed' : `Due: ${new Date(assignment.deadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}
          </span>
          <span className="px-3 py-1 rounded-full font-medium" style={{ background: 'var(--surface-muted)', color: 'var(--text-secondary)' }}>
            Max Marks: {assignment.maxMarks}
          </span>
        </div>
      </div>

      {/* Graded result */}
      {isGraded && (
        <div className="rounded-xl border p-6 mb-6" style={{ background: 'var(--success-light)', borderColor: '#bbf7d0' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-6 h-6" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--success)' }}>Graded</h2>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{submission!.marks}</span>
            <span className="text-lg" style={{ color: 'var(--text-tertiary)' }}>/ {assignment.maxMarks}</span>
          </div>
          {submission!.feedback && (
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Teacher Feedback</p>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{submission!.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submission form */}
      {!isGraded && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {submission ? 'Your Submission' : 'Submit Your Answer'}
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
              {hasChanges && <span className="ml-2 text-amber-600">● Unsaved changes</span>}
            </span>
          </div>
          {submission && (
            <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Submitted on {new Date(submission.submittedAt).toLocaleString()}
              {canSubmit && ' · You can still update before the deadline'}
            </p>
          )}

          {submitError && (
            <div className="mb-3 p-3 rounded-lg border text-sm" style={{ background: 'var(--danger-light)', borderColor: '#fecaca', color: 'var(--danger)' }}>{submitError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              disabled={!canSubmit}
              rows={10}
              required
              placeholder="Write your answer here..."
              className="w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
            />
            <div className="mt-4 flex items-center gap-3">
              <button type="submit" disabled={!canSubmit || submitting || !content.trim()}
                className="px-5 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-shadow flex items-center gap-2"
                style={{ background: 'var(--primary)' }}>
                {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {submitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit'}
              </button>
              {isPastDeadline && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>The deadline has passed. You can no longer submit.</p>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
