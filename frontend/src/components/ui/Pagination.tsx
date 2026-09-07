'use client';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(pageCount - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < pageCount - 1) pages.push('...');
    if (pageCount > 1) pages.push(pageCount);

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5" dir="ltr">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3.5 py-2 text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        قبلی
      </button>
      {getPages().map((p, i) =>
        typeof p === 'string' ? (
          <span key={`dots-${i}`} className="px-2 py-2 text-sm" style={{ color: 'var(--muted)' }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3.5 py-2 text-sm rounded-xl transition-colors ${
              p === page
                ? 'text-white'
                : 'hover:opacity-80'
            }`}
            style={{
              background: p === page ? 'var(--primary)' : 'transparent',
              border: p === page ? 'none' : '1px solid var(--border)',
              color: p === page ? 'var(--primary-text)' : 'var(--text-secondary)',
            }}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="px-3.5 py-2 text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        بعدی
      </button>
    </div>
  );
}
