'use client';

import { userService } from '@/services/user.service';
import { commentService } from '@/services/comment.service';
import { UserListItem } from '@/types/follow.types';
import AuthGuard from '@/components/auth/AuthGuard';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Avatar from '@/components/ui/Avatar';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useState } from 'react';
import { Shield, Users, MessageCircle, Check, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'users' | 'comments';

function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [commentsPage, setCommentsPage] = useState(1);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const usersQuery = useAsyncData<UserListItem[]>(
    () => userService.listUsers(),
    [activeTab],
    { enabled: activeTab === 'users', errorMessage: 'خطا در بارگذاری کاربران' }
  );

  const commentsQuery = useAsyncData(
    () => commentService.list(commentsPage),
    [activeTab, commentsPage],
    { enabled: activeTab === 'comments', errorMessage: 'خطا در بارگذاری نظرها' }
  );

  const handleBlockToggle = async (userId: number) => {
    setBusyUserId(userId);
    try {
      const result = await userService.blockUser(userId);
      toast.success(result.message || 'انجام شد');
      await usersQuery.refetch();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در انجام عملیات');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleAcceptComment = async (id: number) => {
    try {
      await commentService.accept(id);
      toast.success('نظر تایید شد');
      commentsQuery.refetch();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در تایید نظر');
    }
  };

  const handleRejectComment = async (id: number) => {
    try {
      await commentService.reject(id);
      toast.success('نظر رد شد');
      commentsQuery.refetch();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در رد نظر');
    }
  };

  const isLoading = activeTab === 'users' ? usersQuery.isLoading : commentsQuery.isLoading;
  const tabError = activeTab === 'users' ? usersQuery.error : commentsQuery.error;
  const retry = activeTab === 'users' ? usersQuery.refetch : () => commentsQuery.refetch();

  const users = usersQuery.data ?? [];
  const comments = commentsQuery.data?.comments ?? [];
  const commentsPagination = commentsQuery.data?.pagination;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
          <Shield className="h-6 w-6" style={{ color: 'var(--primary)' }} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>پنل مدیریت</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>مدیریت کاربران و نظرها</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit" style={{ background: 'var(--secondary)' }}>
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users className="h-4 w-4" />}>
          کاربران
        </TabButton>
        <TabButton active={activeTab === 'comments'} onClick={() => setActiveTab('comments')} icon={<MessageCircle className="h-4 w-4" />}>
          نظرها
        </TabButton>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="list" />
      ) : tabError ? (
        <ErrorState message={tabError} onRetry={retry} />
      ) : activeTab === 'users' ? (
        users.length === 0 ? (
          <EmptyState title="کاربری یافت نشد" />
        ) : (
          <div className="rounded-2xl shadow-sm overflow-x-auto" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ background: 'var(--secondary)' }}>
                  <th className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>کاربر</th>
                  <th className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>ایمیل</th>
                  <th className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>نقش</th>
                  <th className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>وضعیت</th>
                  <th className="px-4 py-3 text-right text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.profile?.image_profile} alt={user.profile?.nick_name || user.username} size="sm" fallback={user.profile?.nick_name || user.username} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {user.profile?.nick_name || user.username}
                          </p>
                          <p className="text-xs" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" dir="ltr" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{user.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 text-xs rounded-full font-medium"
                        style={
                          user.role === 'admin'
                            ? { background: 'var(--accent-light)', color: 'var(--accent)' }
                            : { background: 'var(--secondary)', color: 'var(--text-secondary)' }
                        }
                      >
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
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <Button
                          variant={user.status === 'block' ? 'outline' : 'danger'}
                          size="sm"
                          isLoading={busyUserId === user.id}
                          onClick={() => handleBlockToggle(user.id)}
                        >
                          {user.status === 'block' ? <><Check className="h-3.5 w-3.5 ml-1" />رفع مسدودی</> : <><Ban className="h-3.5 w-3.5 ml-1" />مسدود کردن</>}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : comments.length === 0 ? (
        <EmptyState title="نظری یافت نشد" />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {comment.user?.profile?.nick_name || comment.user?.username || 'کاربر'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    روی مقاله: {comment.blog?.title || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {comment.accepted ? (
                    <Button variant="outline" size="sm" onClick={() => handleRejectComment(comment.id)}>
                      رد نظر
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => handleAcceptComment(comment.id)}>
                      تایید نظر
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{comment.text}</p>
            </div>
          ))}
          {commentsPagination && commentsPagination.pageCount > 1 && (
            <Pagination page={commentsPage} pageCount={commentsPagination.pageCount} onPageChange={setCommentsPage} />
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
      style={
        active
          ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
          : { color: 'var(--text-tertiary)' }
      }
    >
      {icon}
      {children}
    </button>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}
