'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getRole, getFullName } from '@/lib/auth';
import { toast } from 'sonner';
import { BrandMark } from '@/components/ui';

const navItems: Record<string, { href: string; label: string; icon: string }[]> = {
  Admin: [
    { href: '/admin', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/users', label: 'Users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { href: '/admin/classes', label: 'Classes', icon: 'M12 14l9-5-9-5-9 5 9 5z' },
    { href: '/admin/subjects', label: 'Subjects', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { href: '/admin/teacher-assignments', label: 'Teacher links', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ],
  Teacher: [
    { href: '/teacher/assignments', label: 'Assignments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ],
  Student: [
    { href: '/student/assignments', label: 'Assignments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { href: '/student/submissions', label: 'My submissions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ],
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = getRole();
  const fullName = getFullName();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    document.cookie = 'token=; path=/; max-age=0; samesite=lax';
    document.cookie = 'role=; path=/; max-age=0; samesite=lax';
    toast.success('Signed out');
    router.push('/login');
  };

  const items = navItems[role || ''] || [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] px-3 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-ghost p-2"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <BrandMark size="sm" />
          <span className="font-semibold text-sm tracking-tight text-stone-900">Pathshala</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[15.5rem] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white tracking-tight leading-tight">Pathshala</p>
            <p className="text-[11px] text-stone-500 truncate">{role || 'Workspace'}</p>
          </div>
        </div>

        <nav className="mt-3 px-2.5 space-y-0.5" aria-label="Main">
          {items.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium"
                style={{
                  background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                }}
              >
                <svg className="h-4 w-4 flex-shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          {fullName && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-stone-700 text-stone-100"
              >
                {getInitials(fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium text-stone-100">{fullName}</p>
                <p className="truncate text-[11px] text-stone-500">{role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-md text-[13px] font-medium text-stone-400 hover:text-stone-100 hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main id="main-content" className="lg:ml-[15.5rem] pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl fade-in">{children}</div>
      </main>
    </div>
  );
}
