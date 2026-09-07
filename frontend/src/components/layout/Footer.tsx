import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ویرگول</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/" className="hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              صفحه اصلی
            </Link>
            <Link href="/search" className="hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              جستجو
            </Link>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()} ویرگول. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}
