'use client';

import { useState, useEffect } from 'react';
import { userService } from '@/services/user.service';
import { commentService } from '@/services/comment.service';
import { UserListItem } from '@/types/follow.types';
import { CommentEntity } from '@/types/blog.types';
import AuthGuard from '@/components/auth/AuthGuard';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Shield, Users, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function AdminContent() {
  const [activeTab, setActiveTab] = useState<'users' | 'comments'>('users');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [comments, setComments] = useState<CommentEntity[]>([]);
  const [commentsCurrentPage, setCommentsCurrentPage] = useState(1);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, pageCount: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.listUsers();
      setUsers(data);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (page = 1) => {
    setIsLoading(true);
    setCommentsCurrentPage(page);
    try {
      const data = await commentService.list(page);
      setComments(data.comments);
      setCommentsPagination(data.pagination);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else fetchComments();
  }, [activeTab]);

  const handleBlockToggle = async (userId: number) => {
    try {
      const result = await userService.blockUser(userId);
      toast.success(result.message);
      fetchUsers();
    } catch {
      toast.error('خطا در انجام عملیات');
    }
  };

  const handleAcceptComment = async (id: number) => {
    try {
      await commentService.accept(id);
      toast.success('کامنت تایید شد');
      fetchComments(commentsCurrentPage);
    } catch {
      toast.error('خطا در تایید کامنت');
    }
  };

  const handleRejectComment = async (id: number) => {
    try {
      await commentService.reject(id);
      toast.success('کامنت رد شد');
      fetchComments(commentsCurrentPage);
    } catch {
      toast.error('خطا در رد کامنت');
    }
  };

  return (
    <>
      <style>{`
        .admin-divide-y > tr + tr,
        .admin-divide-y > tbody + tbody {
          border-top: 1px solid var(--border);
        }
        .admin-hover-row:hover {
          background: var(--surface-hover);
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6" style={{ color: 'var(--primary)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>پنل مدیریت</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
            style={activeTab === 'users'
              ? { color: 'var(--primary)', borderBottom: '2px solid var(--primary)' }
              : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }
            }
          >
            <Users className="h-4 w-4" />
            کاربران
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
            style={activeTab === 'comments'
              ? { color: 'var(--primary)', borderBottom: '2px solid var(--primary)' }
              : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }
            }
          >
            <MessageCircle className="h-4 w-4" />
            کامنت‌ها
          </button>
        </div>

        {isLoading ? (
          <LoadingSkeleton type="list" />
        ) : activeTab === 'users' ? (
          users.length === 0 ? (
            <EmptyState title="کاربری یافت نشد" />
          ) : (
            <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'var(--surface)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--secondary)' }}>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>کاربر</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>ایمیل</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>نقش</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>وضعیت</th>
                    <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>عملیات</th>
                  </tr>
                </thead>
                <tbody className="admin-divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="admin-hover-row">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {user.profile?.nick_name || user.username}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{user.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 text-xs rounded-full"
                          style={user.role === 'admin'
                            ? { background: 'var(--accent-light)', color: 'var(--accent)' }
                            : { background: 'var(--secondary)', color: 'var(--text-secondary)' }
                          }
                        >
                          {user.role === 'admin' ? 'مدیر' : 'کاربر'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 text-xs rounded-full"
                          style={user.status === 'block'
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
                            variant={user.status === 'block' ? 'secondary' : 'danger'}
                            size="sm"
                            onClick={() => handleBlockToggle(user.id)}
                          >
                            {user.status === 'block' ? 'رفع مسدودیت' : 'مسدود کردن'}
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
          <EmptyState title="کامنتی یافت نشد" />
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 rounded-xl shadow-sm" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {comment.user?.profile?.nick_name || comment.user?.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>مقاله: {comment.blog?.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.accepted ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRejectComment(comment.id)}
                      >
                        رد
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAcceptComment(comment.id)}
                      >
                        تایید
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>{comment.text}</p>
              </div>
            ))}
            <Pagination
              page={commentsCurrentPage}
              pageCount={commentsPagination.pageCount}
              onPageChange={fetchComments}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}
