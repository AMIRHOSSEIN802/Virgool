'use client';

import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/user.service';
import { FollowEntity } from '@/types/follow.types';
import UserCard from '@/components/profile/UserCard';
import AuthGuard from '@/components/auth/AuthGuard';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';

function FollowersContent() {
  const [followers, setFollowers] = useState<FollowEntity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setCurrentPage(page);
    try {
      const data = await userService.getFollowers(page);
      setFollowers(data.followers);
      setPageCount(data.pagination.pageCount);
      setTotalCount(data.pagination.totalCount);
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  if (isLoading) return <LoadingSkeleton type="list" />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        دنبال‌کنندگان ({totalCount})
      </h1>
      {followers.length === 0 ? (
        <EmptyState title="هنوز دنبال‌کننده‌ای ندارید" />
      ) : (
        <div className="space-y-3">
          {followers.map((f) => f.follower && <UserCard key={f.id} user={f.follower} />)}
        </div>
      )}
      <div className="mt-6">
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={fetchFollowers}
        />
      </div>
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
