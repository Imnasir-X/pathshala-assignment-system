import type { ReactNode } from 'react';

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-8 h-8 text-sm';
  return (
    <span className={`brand-mark ${cls}`} aria-hidden>
      প
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-sub">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {description && <p>{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Alert({
  children,
  variant = 'danger',
}: {
  children: ReactNode;
  variant?: 'danger' | 'info';
}) {
  return <div className={`alert alert-${variant}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Published: 'badge-success',
    Draft: 'badge-warning',
    Submitted: 'badge-info',
    Late: 'badge-danger',
    Graded: 'badge-success',
    ReturnedForRevision: 'badge-warning',
    Admin: 'badge-primary',
    Teacher: 'badge-info',
    Student: 'badge-neutral',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
}
