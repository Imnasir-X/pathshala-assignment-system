import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;

  const { pathname } = request.nextUrl;

  // Allow login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route protection
  if (pathname.startsWith('/admin') && role !== 'Admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname.startsWith('/teacher') && role !== 'Teacher') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname.startsWith('/student') && role !== 'Student') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
