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

function FollowingContent() {
  const [page, setPage] = useState(1);

  const followingQuery = useAsyncData(
    () => userService.getFollowing(page),
    [page],
    { errorMessage: 'خطا در بارگذاری لیست دنبال‌شده‌ها' }
  );

  if (followingQuery.isLoading) return <LoadingSkeleton type="list" />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        دنبال‌شده‌ها
      </h1>
      {followingQuery.error ? (
        <ErrorState message={followingQuery.error} onRetry={followingQuery.refetch} />
      ) : (followingQuery.data?.following ?? []).length === 0 ? (
        <EmptyState title="هنوز کسی را دنبال نکرده‌اید" description="نویسندگان مورد علاقه‌تان را پیدا و دنبال کنید" />
      ) : (
        <div className="space-y-3">
          {(followingQuery.data?.following ?? [])
            .filter((f: FollowEntity) => f.following)
            .map((f: FollowEntity) => (
              <UserCard key={f.id} user={f.following!} />
            ))}
        </div>
      )}
      {followingQuery.data && followingQuery.data.pagination.pageCount > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageCount={followingQuery.data.pagination.pageCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

export default function FollowingPage() {
  return (
    <AuthGuard>
      <FollowingContent />
    </AuthGuard>
  );
}
