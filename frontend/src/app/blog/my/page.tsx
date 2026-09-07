'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { blogService } from '@/services/blog.service';
import { BlogListBlog } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import { Edit, Trash2, Plus, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

function MyBlogsContent() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogListBlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBlogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await blogService.getMyBlogs();
      setBlogs(data);
    } catch {
      setError('خطا در بارگذاری مقالات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await blogService.delete(deleteId);
      toast.success('مقاله حذف شد');
      setBlogs(blogs.filter((b) => b.id !== deleteId));
      setDeleteId(null);
    } catch {
      toast.error('خطا در حذف مقاله');
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={fetchBlogs} />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مقالات من</h1>
        <Link href="/blog/create">
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            مقاله جدید
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="list" />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="هنوز مقاله‌ای ندارید"
          description="اولین مقاله خود را بنویسید"
        />
      ) : (
        <div className="space-y-4">
          {blogs.map((blog) => (
            <div
              key={blog.id}
              className="flex items-center gap-4 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              style={{ background: 'var(--surface)' }}
            >
              {blog.image ? (
                <img
                  src={getImageUrl(blog.image)}
                  alt={blog.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--secondary)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }} className="text-2xl">📝</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/blog/${blog.slug}`}
                  className="text-sm font-medium line-clamp-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {blog.title}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {blog.time_for_study} دقیقه
                  </span>
                  <span>{formatDate(blog.created_at)}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={
                      blog.status === 'published'
                        ? { background: 'var(--success-light)', color: 'var(--success)' }
                        : blog.status === 'draft'
                        ? { background: 'var(--warning-light)', color: 'var(--warning)' }
                        : { background: 'var(--error-light)', color: 'var(--error)' }
                    }
                  >
                    {blog.status === 'published' ? 'منتشر شده' : blog.status === 'draft' ? 'پیش‌نویس' : 'رد شده'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/blog/${blog.slug}`}
                  className="p-2 rounded-lg"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--surface-hover)' }}
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link
                  href={`/blog/${blog.slug}/edit`}
                  className="p-2 rounded-lg"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--surface-hover)' }}
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setDeleteId(blog.id)}
                  className="p-2 rounded-lg"
                  style={{ color: 'var(--text-tertiary)', background: 'var(--error-light)' }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="حذف مقاله">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          آیا از حذف این مقاله اطمینان دارید؟ این عمل قابل بازگشت نیست.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            حذف
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            انصراف
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function MyBlogsPage() {
  return (
    <AuthGuard>
      <MyBlogsContent />
    </AuthGuard>
  );
}
