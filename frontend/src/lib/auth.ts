import { useSyncExternalStore } from 'react';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('role');
}

export function setRole(role: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('role', role);
}

export function getFullName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fullName');
}

export function setFullName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fullName', name);
}

// The middleware reads these cookies to guard routes. They mirror the session
// length issued by the API (8 hours by default).
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function cookieAttributes(maxAge: number): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; secure' : '';
  return `path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

export function setAuthCookies(token: string, role: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `token=${encodeURIComponent(token)}; ${cookieAttributes(SESSION_MAX_AGE_SECONDS)}`;
  document.cookie = `role=${encodeURIComponent(role)}; ${cookieAttributes(SESSION_MAX_AGE_SECONDS)}`;
}

function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `token=; ${cookieAttributes(0)}`;
  document.cookie = `role=; ${cookieAttributes(0)}`;
}

export function clearAuth(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
  }
  clearAuthCookies();
}

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/**
 * Read a value saved in localStorage from a client component without a
 * hydration mismatch: the server render and the first client render both see
 * null, then the stored value is applied.
 */
function useStoredValue(read: () => string | null): string | null {
  return useSyncExternalStore(subscribeToStorage, read, () => null);
}

export function useRole(): string | null {
  return useStoredValue(getRole);
}

export function useFullName(): string | null {
  return useStoredValue(getFullName);
}
