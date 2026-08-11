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

export function clearAuth(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
  }
}
