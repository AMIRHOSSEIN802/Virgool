'use client';

import { useState } from 'react';
import { categoryService } from '@/services/category.service';
import { CategoryEntity } from '@/types/category.types';
import AuthGuard from '@/components/auth/AuthGuard';
import AdminTabs from '@/components/admin/AdminTabs';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsyncData } from '@/hooks/useAsyncData';
import { toPersianDigits } from '@/lib/utils';
import { FolderTree, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TITLE_MIN = 2;
const TITLE_MAX = 30;

/**
 * Admin category management (/admin/categories).
 * CRUD goes through categoryService → shared axios client → /category
 * (backend enforces admin-only + validation; this UI is UX only).
 * Mutations refetch the list via useAsyncData — no window.reload.
 */
function AdminCategoriesContent() {
  const [page, setPage] = useState(1);

  const categoriesQuery = useAsyncData(
    () => categoryService.list(page, 10),
    [page],
    { errorMessage: 'خطا در بارگذاری دسته‌بندی‌ها' }
  );
  const categories = categoriesQuery.data?.categories ?? [];
  const pagination = categoriesQuery.data?.pagination;

  const [editing, setEditing] = useState<CategoryEntity | null>(null);
  const [deleting, setDeleting] = useState<CategoryEntity | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const openCreate = () => { setTitle(''); setCreating(true); };
  const openEdit = (cat: CategoryEntity) => { setTitle(cat.title); setEditing(cat); };
  const closeAll = () => { setCreating(false); setEditing(null); setDeleting(null); };

  const validationError = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < TITLE_MIN) return `عنوان باید حداقل ${toPersianDigits(TITLE_MIN)} کاراکتر باشد`;
    if (trimmed.length > TITLE_MAX) return `عنوان باید حداکثر ${toPersianDigits(TITLE_MAX)} کاراکتر باشد`;
    return null;
  };

  /** Surface the real backend message (400/409/404) — never fake success. */
  const backendError = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message;
    return (Array.isArray(message) ? message[0] : message) || fallback;
  };

  const submitCreate = async () => {
    const invalid = validationError(title);
    if (invalid) { toast.error(invalid); return; }
    if (busy) return; // prevent double submit
    setBusy(true);
    try {
      await categoryService.create({ title: title.trim() });
      toast.success('دسته‌بندی ساخته شد');
      closeAll();
      categoriesQuery.refetch();
    } catch (err: unknown) {
      toast.error(backendError(err, 'خطا در ساخت دسته‌بندی'));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const invalid = validationError(title);
    if (invalid) { toast.error(invalid); return; }
    if (busy) return;
    setBusy(true);
    try {
      await categoryService.update(editing.id, { title: title.trim() });
      toast.success('دسته‌بندی بروزرسانی شد');
      closeAll();
      categoriesQuery.refetch();
    } catch (err: unknown) {
      toast.error(backendError(err, 'خطا در ویرایش دسته‌بندی'));
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!deleting) return;
    if (busy) return;
    setBusy(true);
    try {
      await categoryService.remove(deleting.id);
      toast.success('دسته‌بندی حذف شد');
      closeAll();
      categoriesQuery.refetch();
    } catch (err: unknown) {
      // If the backend rejects the deletion, the row stays and the error is shown.
      toast.error(backendError(err, 'خطا در حذف دسته‌بندی'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
          <FolderTree className="h-6 w-6" style={{ color: 'var(--primary)' }} />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>دسته‌بندی‌ها</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>ساخت، ویرایش و حذف دسته‌های مقالات</p>
        </div>
        <Button size="sm" onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 ms-1.5" />
          دسته جدید
        </Button>
      </div>

      <AdminTabs />

      {categoriesQuery.isLoading ? (
        <LoadingSkeleton type="list" />
      ) : categoriesQuery.error ? (
        <ErrorState message={categoriesQuery.error} onRetry={categoriesQuery.refetch} />
      ) : categories.length === 0 ? (
        <EmptyState title="دسته‌بندی‌ای وجود ندارد" description="اولین دسته را بسازید تا نویسندگان بتوانند مقالات را دسته‌بندی کنند." icon={<FolderTree className="h-12 w-12" />} />
      ) : (
        <>
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {categories.map((cat: CategoryEntity) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={cat.title}>
                      {cat.title}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-3" style={{ color: 'var(--text-tertiary)' }}>
                      <span>#{toPersianDigits(cat.id)}</span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {toPersianDigits(cat.blogCount ?? 0)} مقاله
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(cat)}
                    disabled={busy}
                    aria-label={`ویرایش دسته ${cat.title}`}
                    title="ویرایش"
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(cat)}
                    disabled={busy}
                    aria-label={`حذف دسته ${cat.title}`}
                    title="حذف"
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--error-light)] disabled:opacity-50"
                    style={{ color: 'var(--error)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {pagination && pagination.pageCount > 1 && (
            <div className="mt-6">
              <Pagination page={page} pageCount={pagination.pageCount} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      <Modal isOpen={creating} onClose={() => !busy && closeAll()} title="دسته‌بندی جدید">
        <div className="space-y-4">
          <Input
            label="عنوان دسته"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: برنامه‌نویسی"
            maxLength={TITLE_MAX}
            autoFocus
          />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            بین {toPersianDigits(TITLE_MIN)} تا {toPersianDigits(TITLE_MAX)} کاراکتر — عنوان تکراری پذیرفته نمی‌شود.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeAll} disabled={busy}>انصراف</Button>
            <Button size="sm" onClick={submitCreate} isLoading={busy} disabled={title.trim().length < TITLE_MIN}>
              ساخت
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => !busy && closeAll()} title={`ویرایش: ${editing?.title ?? ''}`}>
        <div className="space-y-4">
          <Input
            label="عنوان دسته"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeAll} disabled={busy}>انصراف</Button>
            <Button size="sm" onClick={submitEdit} isLoading={busy} disabled={title.trim().length < TITLE_MIN}>
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation — same pattern as blog/my & comment delete */}
      <Modal isOpen={!!deleting} onClose={() => !busy && closeAll()} title="حذف دسته‌بندی">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            آیا از حذف «{deleting?.title}» مطمئن هستید؟
            {(deleting?.blogCount ?? 0) > 0 && (
              <span> این دسته {toPersianDigits(deleting?.blogCount ?? 0)} مقاله دارد؛ مقالات حذف نمی‌شوند اما این دسته از آن‌ها برداشته می‌شود.</span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={closeAll} disabled={busy}>انصراف</Button>
            <Button variant="danger" size="sm" onClick={submitDelete} isLoading={busy}>حذف دسته‌بندی</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminCategoriesContent />
    </AuthGuard>
  );
}
