'use client';

import { useState } from 'react';
import { blogService } from '@/services/blog.service';
import { BlogListBlog } from '@/types/blog.types';
import { getImageUrl } from '@/lib/constants';
import { formatDate, toPersianDigits } from '@/lib/utils';
import AuthGuard from '@/components/auth/AuthGuard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAsyncData } from '@/hooks/useAsyncData';
import Image from 'next/image';
import Link from 'next/link';
import { Edit, Trash2, Plus, Clock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels: Record<string, { label: string; bg: string; fg: string }> = {
  published: { label: 'منتشر شده', bg: 'var(--success-light)', fg: 'var(--success)' },
  draft: { label: 'در انتظار تایید', bg: 'var(--warning-light)', fg: 'var(--warning)' },
  reject: { label: 'رد شده', bg: 'var(--error-light)', fg: 'var(--error)' },
};

function MyBlogsContent() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const blogsQuery = useAsyncData<BlogListBlog[]>(
    () => blogService.getMyBlogs(),
    [],
    { errorMessage: 'خطا در بارگذاری مقالات' }
  );
  const blogs = blogsQuery.data ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await blogService.delete(deleteId);
      toast.success('مقاله حذف شد');
      setDeleteId(null);
      blogsQuery.refetch();
    } catch {
      toast.error('خطا در حذف مقاله');
    } finally {
      setIsDeleting(false);
    }
  };

  const targetBlog = blogs.find((b) => b.id === deleteId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مقالات من</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {blogs.length > 0 ? `${toPersianDigits(blogs.length)} مقاله` : 'مدیریت مقالات شما'}
          </p>
        </div>
        <Link href="/blog/create">
          <Button>
            <Plus className="h-4 w-4 ml-1.5" />
            مقاله جدید
          </Button>
        </Link>
      </div>

      {blogsQuery.isLoading ? (
        <LoadingSkeleton type="list" />
      ) : blogsQuery.error ? (
        <ErrorState message={blogsQuery.error} onRetry={blogsQuery.refetch} />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="هنوز مقاله‌ای ندارید"
          description="اولین مقاله خود را بنویسید و با دیگران به اشتراک بگذارید"
        />
      ) : (
        <div className="space-y-3">
          {blogs.map((blog) => {
            const status = statusLabels[blog.status as string] ?? statusLabels.draft;
            return (
              <div
                key={blog.id}
                className="flex items-center gap-4 p-4 rounded-2xl transition-shadow hover:shadow-md"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {blog.image ? (
                  <span className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 block">
                    <Image
                      src={getImageUrl(blog.image)}
                      alt={blog.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                    style={{ background: 'var(--secondary)' }}
                    aria-hidden
                  >
                    📝
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/blog/${encodeURIComponent(blog.slug)}`}
                    className="text-sm font-bold line-clamp-1 hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {blog.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {toPersianDigits(blog.time_for_study)} دقیقه
                    </span>
                    <span>{formatDate(blog.created_at)}</span>
                    <span
                      className="px-2 py-0.5 rounded-full font-medium"
                      style={{ background: status.bg, color: status.fg }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <IconAction href={`/blog/${encodeURIComponent(blog.slug)}`} label="مشاهده">
                    <ExternalLink className="h-4 w-4" />
                  </IconAction>
                  <IconAction href={`/blog/${encodeURIComponent(blog.slug)}/edit`} label="ویرایش">
                    <Edit className="h-4 w-4" />
                  </IconAction>
                  <button
                    onClick={() => setDeleteId(blog.id)}
                    aria-label="حذف مقاله"
                    className="p-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ color: 'var(--error)', background: 'var(--error-light)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="حذف مقاله">
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          آیا از حذف مقاله «{targetBlog?.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            بله، حذف شود
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            انصراف
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function IconAction({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="p-2 rounded-lg transition-opacity hover:opacity-80"
      style={{ color: 'var(--text-tertiary)', background: 'var(--secondary)' }}
    >
      {children}
    </Link>
  );
}

export default function MyBlogsPage() {
  return (
    <AuthGuard>
      <MyBlogsContent />
    </AuthGuard>
  );
}
