'use client';

import { userService } from '@/services/user.service';
import { FollowEntity } from '@/types/follow.types';
import UserCard from '@/components/profile/UserCard';
import AuthGuard from '@/components/auth/AuthGuard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useState } from 'react';

function FollowersContent() {
  const [page, setPage] = useState(1);

  const followersQuery = useAsyncData(
    () => userService.getFollowers(page),
    [page],
    { errorMessage: 'خطا در بارگذاری دنبال‌کنندگان' }
  );

  if (followersQuery.isLoading) return <LoadingSkeleton type="list" />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        دنبال‌کنندگان
      </h1>
      {followersQuery.error ? (
        <ErrorState message={followersQuery.error} onRetry={followersQuery.refetch} />
      ) : (followersQuery.data?.followers ?? []).length === 0 ? (
        <EmptyState title="هنوز دنبال‌کننده‌ای ندارید" description="با نوشتن مقالات جذاب، دنبال‌کننده پیدا کنید" />
      ) : (
        <div className="space-y-3">
          {(followersQuery.data?.followers ?? [])
            .filter((f: FollowEntity) => f.follower)
            .map((f: FollowEntity) => (
              <UserCard key={f.id} user={f.follower!} />
            ))}
        </div>
      )}
      {followersQuery.data && followersQuery.data.pagination.pageCount > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageCount={followersQuery.data.pagination.pageCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

export default function FollowersPage() {
  return (
    <AuthGuard>
      <FollowersContent />
    </AuthGuard>
  );
}
