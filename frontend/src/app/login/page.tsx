'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiPost, ApiErrorImpl } from '@/lib/api-client';
import { setToken, setRole, setFullName } from '@/lib/auth';
import type { LoginResponse } from '@/lib/types';
import { BrandMark } from '@/components/ui';
import ChromaticWaves from '@/components/chromatic-waves';
import ScrambleButton from '@/components/scramble-button';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO = [
  { role: 'Admin', email: 'admin@edu.bd' },
  { role: 'Teacher', email: 'abdur.rahman@edu.bd' },
  { role: 'Student', email: 'sadia.islam@edu.bd' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiPost<LoginResponse>('/api/auth/login', data);
      setToken(response.token);
      setRole(response.role);
      setFullName(response.fullName);
      document.cookie = `token=${response.token}; path=/; max-age=28800; samesite=lax`;
      document.cookie = `role=${response.role}; path=/; max-age=28800; samesite=lax`;

      if (response.role === 'Admin') router.push('/admin');
      else if (response.role === 'Teacher') router.push('/teacher/assignments');
      else router.push('/student/assignments');
    } catch (err) {
      if (err instanceof ApiErrorImpl) setError(err.detail);
      else setError('Could not sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Passw0rd!', { shouldValidate: true });
    setError(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: context panel */}
      <aside className="login-hero relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-10 xl:p-14 overflow-hidden">
        <ChromaticWaves
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          aria-hidden
          colors={['#5eead4', '#99f6e4', '#2dd4bf', '#14b8a6', '#0f766e', '#ffffff']}
          cellSize={40}
          speed={3}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <BrandMark size="lg" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-stone-50">Pathshala</p>
              <p className="text-xs login-hero-muted">Assignments &amp; submissions</p>
            </div>
          </div>
          <h1 className="text-3xl xl:text-[2.35rem] font-semibold tracking-tight leading-[1.2] max-w-md">
            Schoolwork that stays{' '}
            <span className="login-hero-accent">on track</span>.
          </h1>
          <p className="mt-4 login-hero-muted text-[0.95rem] leading-relaxed max-w-sm">
            Teachers publish class work. Students submit before the deadline.
            Marks and feedback land in one place.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { t: 'Admin', d: 'Users & classes' },
              { t: 'Teacher', d: 'Assign & grade' },
              { t: 'Student', d: 'Submit work' },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
                <p className="text-xs font-semibold login-hero-chip-title">{x.t}</p>
                <p className="text-[11px] login-hero-muted mt-0.5">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-600">
            Built for the Assistant Software Engineer recruitment project.
          </p>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <BrandMark />
            <div>
              <p className="font-semibold text-stone-900 leading-tight">Pathshala</p>
              <p className="text-xs text-stone-500">Sign in to continue</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="page-title">Sign in</h2>
            <p className="page-sub">Use your institution email and password.</p>
          </div>

          {error && (
            <div className="alert alert-danger mb-4 flex gap-2 items-start">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`field ${errors.email ? 'field-error' : ''}`}
                placeholder="you@edu.bd"
              />
              {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`field pr-11 ${errors.password ? 'field-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
            </div>

            <ScrambleButton
              label="Sign in"
              loadingLabel="Signing in…"
              loading={loading}
              className="btn btn-primary w-full py-2.5 mt-1"
              sweepColor="#99f6e4"
            />
          </form>

          <div className="mt-8 pt-6 border-t border-stone-200">
            <p className="text-xs font-medium text-stone-500 mb-3">Demo accounts · password <code className="font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">Passw0rd!</code></p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                  title={`Fill ${d.email}`}
                >
                  {d.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
