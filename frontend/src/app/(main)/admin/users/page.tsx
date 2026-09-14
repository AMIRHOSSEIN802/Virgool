'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userService } from '@/services/user.service';
import { UserListItem } from '@/types/follow.types';
import AuthGuard from '@/components/auth/AuthGuard';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import AdminTabs from '@/components/admin/AdminTabs';
import { formatDate, toPersianDigits } from '@/lib/utils';
import { Ban, Check, Search as SearchIcon, Shield, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

type RoleFilter = 'all' | 'user' | 'admin';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'user', label: 'کاربران' },
  { value: 'admin', label: 'مدیران' },
];

/**
 * Admin users directory (/admin/users).
 * URL is the source of truth: ?q=&role=&page= — refresh / Back/Forward /
 * direct links all restore the exact list state. Data via userService →
 * shared axios client → GET /user/list (backend-enforced admin-only; the
 * response is whitelisted server-side — no password/OTP/token fields exist
 * in the payload by construction).
 */
function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') || '';
  const role = (searchParams.get('role') || 'all') as RoleFilter;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Input mirrors the URL; typing is local until submit (explicit search —
  // same convention as the public Search page).
  const [query, setQuery] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setQuery(q);
  }

  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const buildUrl = (overrides: { q?: string; role?: string; page?: number }) => {
    const next = {
      q: overrides.q !== undefined ? overrides.q : q,
      role: overrides.role !== undefined ? overrides.role : role,
      page: overrides.page !== undefined ? overrides.page : page,
    };
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.role && next.role !== 'all') params.set('role', next.role);
    if (next.page > 1) params.set('page', String(next.page));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : '/admin/users';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setQuery(trimmed);
    router.push(buildUrl({ q: trimmed, page: 1 }));
  };

  const handleRole = (value: string) => router.push(buildUrl({ role: value, page: 1 }));

  const usersQuery = useAsyncData(
    () => userService.listUsers({ page, limit: 10, search: q || undefined, role }),
    [q, role, page],
    { errorMessage: 'خطا در بارگذاری کاربران' }
  );

  const handleBlockToggle = async (userId: number) => {
    if (busyUserId) return; // prevent duplicate requests
    setBusyUserId(userId);
    try {
      const result = await userService.blockUser(userId);
      toast.success(result.message || 'انجام شد');
      usersQuery.refetch();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در انجام عملیات');
    } finally {
      setBusyUserId(null);
    }
  };

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
          <Users className="h-6 w-6" style={{ color: 'var(--primary)' }} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>مدیریت کاربران</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>جستجو، فیلتر و مسدودسازی حساب‌ها</p>
        </div>
      </div>

      <AdminTabs />

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSubmit} className="relative flex-1 max-w-md" role="search">
          <SearchIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--muted)' }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="نام کاربری، نام مستعار، ایمیل یا شماره…"
            aria-label="جستجوی کاربر"
            className="w-full pr-10 pl-9 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); router.push(buildUrl({ q: '', page: 1 })); }}
              aria-label="پاک کردن جستجو"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div className="flex gap-1 rounded-xl p-1 w-fit self-start sm:self-auto" style={{ background: 'var(--secondary)' }} role="group" aria-label="فیلتر نقش">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRole(opt.value)}
              aria-pressed={role === opt.value}
              className="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all"
              style={
                role === opt.value
                  ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
                  : { color: 'var(--text-tertiary)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {usersQuery.isLoading ? (
        <LoadingSkeleton type="list" />
      ) : usersQuery.error ? (
        <ErrorState message={usersQuery.error} onRetry={usersQuery.refetch} />
      ) : users.length === 0 ? (
        <EmptyState
          title="کاربری یافت نشد"
          description={q ? `نتیجه‌ای برای «${q}» با این فیلترها وجود ندارد.` : 'با این فیلترها کاربری نمایش داده نمی‌شود.'}
        />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {toPersianDigits(pagination?.totalCount ?? 0)} کاربر
          </p>

          {/* Desktop/tablet: dense table */}
          <div className="hidden md:block rounded-2xl shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--secondary)' }}>
                  {['کاربر', 'تماس', 'نقش', 'وضعیت', 'عضویت', 'عملیات'].map((h) => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user: UserListItem, idx) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    borderTop={idx > 0}
                    busy={busyUserId === user.id}
                    busyAny={busyUserId !== null}
                    onToggle={handleBlockToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards (no forced horizontal scroll) */}
          <div className="md:hidden space-y-3">
            {users.map((user: UserListItem) => (
              <div key={user.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={user.profile?.image_profile} alt={user.profile?.nick_name || user.username} size="sm" fallback={user.profile?.nick_name || user.username} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {user.profile?.nick_name || user.username}
                      </p>
                      <p className="text-xs truncate" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>@{user.username}</p>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 text-xs rounded-full font-medium shrink-0"
                    style={
                      user.status === 'block'
                        ? { background: 'var(--error-light)', color: 'var(--error)' }
                        : { background: 'var(--success-light)', color: 'var(--success)' }
                    }
                  >
                    {user.status === 'block' ? 'مسدود' : 'فعال'}
                  </span>
                </div>
                <div className="mt-3 text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>شماره: <span dir="ltr">{user.phone || '—'}</span></span>
                  <span>ایمیل: <span dir="ltr" className="break-all">{user.email || '—'}</span></span>
                </div>
                {user.role !== 'admin' && (
                  <div className="mt-3">
                    <Button
                      variant={user.status === 'block' ? 'outline' : 'danger'}
                      size="sm"
                      isLoading={busyUserId === user.id}
                      disabled={busyUserId !== null}
                      onClick={() => handleBlockToggle(user.id)}
                    >
                      {user.status === 'block' ? <><Check className="h-3.5 w-3.5 ms-1" />رفع مسدودی</> : <><Ban className="h-3.5 w-3.5 ms-1" />مسدود کردن</>}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pagination && pagination.pageCount > 1 && (
            <div className="mt-6">
              <Pagination page={page} pageCount={pagination.pageCount} onPageChange={(p) => router.push(buildUrl({ page: p }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserRow({
  user,
  borderTop,
  busy,
  busyAny,
  onToggle,
}: {
  user: UserListItem;
  borderTop: boolean;
  busy: boolean;
  busyAny: boolean;
  onToggle: (id: number) => void;
}) {
  return (
    <tr style={{ borderTop: borderTop ? '1px solid var(--border)' : 'none' }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={user.profile?.image_profile} alt={user.profile?.nick_name || user.username} size="sm" fallback={user.profile?.nick_name || user.username} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user.profile?.nick_name || user.username}
            </p>
            <p className="text-xs truncate" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>@{user.username}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs" dir="ltr" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
        <p>{user.phone || '—'}</p>
        <p className="mt-0.5 break-all">{user.email || '—'}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className="px-2.5 py-1 text-xs rounded-full font-medium inline-flex items-center gap-1"
          style={
            user.role === 'admin'
              ? { background: 'var(--accent-light)', color: 'var(--accent)' }
              : { background: 'var(--secondary)', color: 'var(--text-secondary)' }
          }
        >
          {user.role === 'admin' && <Shield className="h-3 w-3" />}
          {user.role === 'admin' ? 'مدیر' : 'کاربر'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className="px-2.5 py-1 text-xs rounded-full font-medium"
          style={
            user.status === 'block'
              ? { background: 'var(--error-light)', color: 'var(--error)' }
              : { background: 'var(--success-light)', color: 'var(--success)' }
          }
        >
          {user.status === 'block' ? 'مسدود' : 'فعال'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
        {user.created_at ? formatDate(user.created_at) : '—'}
      </td>
      <td className="px-4 py-3">
        {user.role !== 'admin' ? (
          <Button
            variant={user.status === 'block' ? 'outline' : 'danger'}
            size="sm"
            isLoading={busy}
            disabled={busyAny}
            onClick={() => onToggle(user.id)}
          >
            {user.status === 'block' ? <><Check className="h-3.5 w-3.5 ms-1" />رفع مسدودی</> : <><Ban className="h-3.5 w-3.5 ms-1" />مسدود کردن</>}
          </Button>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
        )}
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAdmin>
      <Suspense fallback={<LoadingSkeleton type="list" />}>
        <AdminUsersContent />
      </Suspense>
    </AuthGuard>
  );
}
