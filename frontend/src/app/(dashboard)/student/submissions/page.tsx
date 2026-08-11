'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import type { Submission, Assignment } from '@/lib/types';
import { PageHeader, EmptyState, Alert, StatusBadge } from '@/components/ui';

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Map<number, Assignment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, assignData] = await Promise.all([
        apiFetch<Submission[]>('/api/submissions/mine?page=1&pageSize=50'),
        apiFetch<Assignment[]>('/api/assignments?page=1&pageSize=50'),
      ]);
      setSubmissions(subs);
      setAssignments(new Map(assignData.map(a => [a.id, a])));
    } catch {
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubs(); }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-7 w-44 skeleton mb-4" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-24 skeleton rounded-[var(--radius)]" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <p className="font-medium mb-1">{error}</p>
        <button onClick={fetchSubs} className="underline text-sm">Try again</button>
      </Alert>
    );
  }

  return (
    <div>
      <PageHeader
        title="My submissions"
        description="Status, marks, and teacher feedback."
      />

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Open an assignment and submit your answer before the deadline."
          action={
            <Link href="/student/assignments" className="btn btn-primary">
              Browse assignments
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => {
            const a = assignments.get(s.assignmentId);
            return (
              <Link
                key={s.id}
                href={`/student/assignments/${s.assignmentId}`}
                className="list-row card-lift no-underline"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-[0.95rem] text-stone-900">
                      {a?.title || `Assignment #${s.assignmentId}`}
                    </h3>
                    <StatusBadge status={s.status} />
                  </div>
                  {a && (
                    <p className="text-sm text-stone-600">
                      {a.subjectName}
                      <span className="text-stone-400"> · </span>
                      {a.className}
                    </p>
                  )}
                  <p className="text-xs text-stone-500 mt-1">
                    Submitted {new Date(s.submittedAt).toLocaleString()}
                  </p>
                  {s.status === 'Graded' && s.marks != null && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <p className="text-sm font-semibold text-green-800 tabular-nums">{s.marks} marks</p>
                      {s.feedback && (
                        <p className="text-xs text-stone-600 mt-0.5">“{s.feedback}”</p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
