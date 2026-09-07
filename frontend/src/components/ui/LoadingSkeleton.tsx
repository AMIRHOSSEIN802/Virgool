interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'profile';
}

export default function LoadingSkeleton({ type = 'card' }: LoadingSkeletonProps) {
  const bg = 'var(--skeleton)';

  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl animate-pulse"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="h-12 w-12 rounded-full" style={{ background: bg }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded w-1/3" style={{ background: bg }} />
              <div className="h-3 rounded w-1/2" style={{ background: bg }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-xl" style={{ background: bg }} />
        <div className="flex items-center gap-4 -mt-10 px-4">
          <div className="h-20 w-20 rounded-full border-4" style={{ background: bg, borderColor: 'var(--surface)' }} />
          <div className="space-y-2 pt-8">
            <div className="h-5 rounded w-40" style={{ background: bg }} />
            <div className="h-4 rounded w-28" style={{ background: bg }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden animate-pulse"
          style={{ background: 'var(--card)' }}
        >
          <div className="h-48" style={{ background: bg }} />
          <div className="p-5 space-y-3">
            <div className="h-5 rounded w-3/4" style={{ background: bg }} />
            <div className="h-4 rounded w-full" style={{ background: bg }} />
            <div className="h-4 rounded w-2/3" style={{ background: bg }} />
            <div className="flex items-center gap-3 pt-2">
              <div className="h-8 w-8 rounded-full" style={{ background: bg }} />
              <div className="h-4 rounded w-24" style={{ background: bg }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
