import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="text-7xl font-bold mb-4" style={{ color: 'var(--muted-light)', opacity: 0.4 }}>۴۰۴</div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>صفحه یافت نشد</h1>
      <p className="mb-8" style={{ color: 'var(--text-tertiary)' }}>صفحه‌ای که دنبال آن هستید وجود ندارد.</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
        style={{ background: 'var(--primary)' }}
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
