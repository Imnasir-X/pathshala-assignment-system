import type { ApiError } from './types';
import { getToken, clearAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiErrorImpl extends Error implements ApiError {
  title: string;
  status: number;
  detail: string;

  constructor(title: string, detail: string, status: number) {
    super(detail);
    this.title = title;
    this.detail = detail;
    this.status = status;
  }
}

// Simple in-flight request dedup — prevents duplicate GET calls
// when multiple components mount simultaneously
const inflight = new Map<string, Promise<unknown>>();

function dedupKey(path: string, method: string): string | null {
  if (method !== 'GET') return null;
  return path;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const method = options.method || 'GET';
  const key = dedupKey(path, method);

  // Return existing in-flight GET request if one exists
  if (key && inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const promise = doFetch<T>(path, options, token);

  if (key) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }

  return promise;
}

async function doFetch<T>(path: string, options: RequestInit, token: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiErrorImpl('Unauthorized', 'Your session has expired. Please log in again.', 401);
  }

  if (!res.ok) {
    let errorData: { title?: string; detail?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      // Response might not be JSON
    }
    throw new ApiErrorImpl(
      errorData.title || 'Error',
      errorData.detail || `Request failed with status ${res.status}`,
      res.status
    );
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
