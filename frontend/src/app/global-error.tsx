'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'var(--background)' }}
        >
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border text-center" style={{ borderColor: 'var(--border)' }}>
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
              style={{ background: 'var(--danger-light)' }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: 'var(--danger)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred while rendering the application.
              {error.digest ? (
                <span className="block mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Error ID: {error.digest}
                </span>
              ) : null}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={reset}
                className="px-5 py-2.5 text-white rounded-lg font-medium"
                style={{ background: 'var(--accent)' }}
              >
                Try again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-5 py-2.5 rounded-lg font-medium"
                style={{ background: 'var(--surface-muted)', color: 'var(--text-primary)' }}
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
