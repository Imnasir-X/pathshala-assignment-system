'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import type { User, Assignment } from '@/lib/types';
import { PageHeader, Alert } from '@/components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, assignments: 0, submissions: 0, classes: 0, subjects: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, assignments, classes, subjects] = await Promise.all([
          apiFetch<User[]>('/api/users?page=1&pageSize=100'),
          apiFetch<Assignment[]>('/api/assignments?page=1&pageSize=100'),
          apiFetch<{ id: number }[]>('/api/classes?page=1&pageSize=100'),
          apiFetch<{ id: number }[]>('/api/subjects?page=1&pageSize=100'),
        ]);

        const submissionsCounts = await Promise.all(
          assignments.map(a =>
            apiFetch<{ id: number }[]>(`/api/assignments/${a.id}/submissions?page=1&pageSize=100`)
              .then(s => s.length)
              .catch(() => 0)
          )
        );
        const totalSubmissions = submissionsCounts.reduce((sum, n) => sum + n, 0);

        setStats({
          users: users.length,
          assignments: assignments.length,
          submissions: totalSubmissions,
          classes: classes.length,
          subjects: subjects.length,
        });
      } catch {
        setError('Failed to load dashboard data. Check that the API is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-7 w-40 skeleton mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 skeleton rounded-[var(--radius)]" />)}
        </div>
      </div>
    );
  }

  if (error) return <Alert>{error}</Alert>;

  const cards = [
    { label: 'Users', value: stats.users, href: '/admin/users' },
    { label: 'Classes', value: stats.classes, href: '/admin/classes' },
    { label: 'Subjects', value: stats.subjects, href: '/admin/subjects' },
    { label: 'Assignments', value: stats.assignments, href: '/admin/teacher-assignments' },
    { label: 'Submissions', value: stats.submissions, href: '/admin/teacher-assignments' },
  ];

  const actions = [
    { label: 'Add user', href: '/admin/users' },
    { label: 'Add class', href: '/admin/classes' },
    { label: 'Add subject', href: '/admin/subjects' },
    { label: 'Link teacher', href: '/admin/teacher-assignments' },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Institution snapshot — users, classes, and assignment activity."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="panel p-4 hover:border-[var(--border-strong)] transition-colors">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold text-stone-900">Quick setup</h2>
        <p className="text-xs text-stone-500 mt-0.5 mb-4">Common admin tasks to get a class running.</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="btn btn-secondary">
              {a.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
