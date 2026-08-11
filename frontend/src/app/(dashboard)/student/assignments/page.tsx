'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import type { Assignment } from '@/lib/types';
import { PageHeader, EmptyState, Alert } from '@/components/ui';

function timeRemaining(deadline: string): { text: string; tone: 'past' | 'urgent' | 'ok' } {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0) return { text: 'Deadline passed', tone: 'past' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 2) return { text: `${days} days left`, tone: 'ok' };
  if (days > 0) return { text: `${days} day${days !== 1 ? 's' : ''} left`, tone: 'urgent' };
  if (hours > 0) return { text: `${hours}h left`, tone: 'urgent' };
  return { text: 'Under 1h left', tone: 'urgent' };
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div>
        <div className="h-7 w-40 skeleton mb-6" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 skeleton rounded-[var(--radius)]" />)}
        </div>
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

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Published work for your class. Open an item to submit."
      />

      {assignments.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          description="When your teacher publishes an assignment for your class, it will show up here."
        />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const remaining = timeRemaining(a.deadline);
            const rowTone =
              remaining.tone === 'past'
                ? 'list-row list-row-past'
                : remaining.tone === 'urgent'
                  ? 'list-row list-row-urgent'
                  : 'list-row list-row-published';
            const badge =
              remaining.tone === 'past'
                ? 'badge badge-danger'
                : remaining.tone === 'urgent'
                  ? 'badge badge-warning'
                  : 'badge badge-primary';
            return (
              <Link key={a.id} href={`/student/assignments/${a.id}`} className={`${rowTone} card-lift block no-underline`}>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[0.95rem] text-stone-900">{a.title}</h3>
                  <p className="text-sm text-stone-600 mt-0.5">
                    {a.subjectName}
                    <span className="text-stone-400"> · </span>
                    {a.className}
                  </p>
                  {a.description && (
                    <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{a.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
                  <span className={badge}>{remaining.text}</span>
                  <span className="text-xs text-stone-500">
                    Due {new Date(a.deadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="text-xs font-medium text-stone-600">Max {a.maxMarks}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
