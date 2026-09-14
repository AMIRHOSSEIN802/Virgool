interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'profile' | 'article';
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
    // Structurally mirrors ProfileHeader (cover h-32 sm:h-40, avatar crossing
    // its boundary, identity + inline stats) so there is no layout jump on
    // data arrival.
    return (
      <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-32 sm:h-40" style={{ background: bg }} />
        <div className="px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="relative z-10 self-start shrink-0 -mt-10 sm:-mt-12 rounded-full p-1.5" style={{ background: 'var(--surface)' }}>
              <div className="h-20 w-20 rounded-full" style={{ background: bg }} />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-6 rounded w-44" style={{ background: bg }} />
              <div className="h-4 rounded w-28" style={{ background: bg }} />
              <div className="h-4 rounded w-2/3" style={{ background: bg }} />
              <div className="flex items-center gap-4 pt-1">
                <div className="h-5 w-24 rounded" style={{ background: bg }} />
                <div className="h-5 w-24 rounded" style={{ background: bg }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'article') {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 rounded w-3/4" style={{ background: bg }} />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full" style={{ background: bg }} />
          <div className="space-y-2">
            <div className="h-4 rounded w-32" style={{ background: bg }} />
          </div>
        </div>
        <div className="h-56 rounded-xl" style={{ background: bg }} />
        <div className="h-4 rounded w-full" style={{ background: bg }} />
        <div className="h-4 rounded w-11/12" style={{ background: bg }} />
        <div className="h-4 rounded w-4/5" style={{ background: bg }} />
        <div className="h-4 rounded w-full" style={{ background: bg }} />
        <div className="h-4 rounded w-2/3" style={{ background: bg }} />
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
