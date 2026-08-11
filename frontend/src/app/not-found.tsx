import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold mb-4" style={{ color: 'var(--accent)' }}>404</p>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Page Not Found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 text-white rounded-lg font-medium"
          style={{ background: 'var(--accent)' }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
