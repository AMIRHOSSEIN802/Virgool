'use client';

import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/user.service';
import { FollowEntity } from '@/types/follow.types';
import UserCard from '@/components/profile/UserCard';
import AuthGuard from '@/components/auth/AuthGuard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

function FollowingContent() {
  const [following, setFollowing] = useState<FollowEntity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowing = useCallback(async (page = 1) => {
    setIsLoading(true);
    setCurrentPage(page);
    try {
      const data = await userService.getFollowing(page);
      setFollowing(data.following);
      setPageCount(data.pagination.pageCount);
      setTotalCount(data.pagination.totalCount);
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  if (isLoading) return <LoadingSkeleton type="list" />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        دنبال شوندگان ({totalCount})
      </h1>
      {following.length === 0 ? (
        <EmptyState title="هنوز کسی را دنبال نکرده‌اید" />
      ) : (
        <div className="space-y-3">
          {following.map((f) => f.following && <UserCard key={f.id} user={f.following} />)}
        </div>
      )}
      <div className="mt-6">
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={fetchFollowing}
        />
      </div>
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
