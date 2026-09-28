import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlogEditorPage from './page';
import type { BlogDetailResponse } from '@/types/blog.types';

/**
 * R-02 — the editor page is where saving and publishing meet. These tests pin
 * the contract: saving/creating only ever saves (status stays Draft), while
 * publishing happens solely through the explicit Publish action, updates the
 * UI immediately and fails without corrupting local state.
 *
 * Tiptap is stubbed — the editor's own behavior is not under test here; only
 * the save/publish orchestration of the page is.
 */
const {
  updateMock,
  createMock,
  publishMock,
  getBySlugMock,
  listMock,
  pushMock,
  toastSuccessMock,
  toastErrorMock,
  toastLoadingMock,
  toastDismissMock,
  getHTMLMock,
  getTextMock,
  params,
  router,
  editor,
} = vi.hoisted(() => {
  const updateMock = vi.fn();
  const createMock = vi.fn();
  const publishMock = vi.fn();
  const getBySlugMock = vi.fn();
  const listMock = vi.fn();
  const pushMock = vi.fn();
  const backMock = vi.fn();
  const toastSuccessMock = vi.fn();
  const toastErrorMock = vi.fn();
  const toastLoadingMock = vi.fn();
  const toastDismissMock = vi.fn();
  const getHTMLMock = vi.fn();
  const getTextMock = vi.fn();
  const setContentMock = vi.fn();
  // Stable identities: the page's load effect depends on `router`/`editor`.
  const params: { slug?: string } = { slug: 'draft-slug' };
  const router = { push: pushMock, back: backMock };
  const editor = {
    getHTML: getHTMLMock,
    getText: getTextMock,
    isActive: () => false,
    commands: { setContent: setContentMock },
  };
  return {
    updateMock,
    createMock,
    publishMock,
    getBySlugMock,
    listMock,
    pushMock,
    backMock,
    toastSuccessMock,
    toastErrorMock,
    toastLoadingMock,
    toastDismissMock,
    getHTMLMock,
    getTextMock,
    setContentMock,
    params,
    router,
    editor,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => params,
}));

vi.mock('@tiptap/react', () => ({
  useEditor: () => editor,
  EditorContent: () => <div data-testid="editor" />,
}));

vi.mock('@/services/blog.service', () => ({
  blogService: {
    getBySlug: getBySlugMock,
    create: createMock,
    update: updateMock,
    publish: publishMock,
  },
}));

vi.mock('@/services/category.service', () => ({
  categoryService: { list: listMock },
}));

vi.mock('@/services/image.service', () => ({
  imageService: { upload: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
    loading: toastLoadingMock,
    dismiss: toastDismissMock,
  },
}));

vi.mock('@/components/auth/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const DRAFT_BLOG = {
  id: 77,
  title: 'عنوان مقاله آزمایشی',
  slug: 'draft-slug',
  description: 'توضیحات کافی برای تست ذخیره مقاله',
  content: '<p>محتوای مقاله</p>',
  time_for_study: '5',
  status: 'draft' as const,
  authorId: 1,
  image: null,
  likeCount: 0,
  bookmarkCount: 0,
  commentCount: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  categories: [{ id: 10, category: { title: 'برنامه‌نویسی' } }],
};

const detailResponse = (): BlogDetailResponse => ({
  blog: { ...DRAFT_BLOG },
  isLiked: false,
  isBookmarked: false,
  commentsData: {
    pagination: { totalCount: 0, page: 1, limit: 10, pageCount: 0 },
    comments: [],
  },
  suggestBlogs: [],
});

const publishButton = () => screen.queryByTestId('publish-button') as HTMLButtonElement | null;

const renderEditor = async () => {
  render(<BlogEditorPage />);
  // The edit form only appears once the draft has been loaded.
  await screen.findByText('ذخیره تغییرات');
};

beforeEach(() => {
  vi.clearAllMocks();
  params.slug = 'draft-slug';
  getHTMLMock.mockReturnValue('<p>محتوای کافی برای ذخیره</p>');
  getTextMock.mockReturnValue('چند کلمه متن');
  listMock.mockResolvedValue({ categories: [] });
  getBySlugMock.mockResolvedValue(detailResponse());
});

describe('blog editor publish flow (R-02)', () => {
  it('saving a draft never publishes it', async () => {
    updateMock.mockResolvedValue({ message: 'بروزرسانی شد' });

    await renderEditor();
    fireEvent.click(screen.getByText('ذخیره تغییرات'));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ title: DRAFT_BLOG.title, content: '<p>محتوای کافی برای ذخیره</p>' }),
    );
    expect(publishMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith('مقاله با موفقیت بروزرسانی شد');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/blog/my'));
  });

  it('shows the explicit Publish action for a draft', async () => {
    await renderEditor();
    expect(publishButton()).not.toBeNull();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('publishes exactly once on click and reflects Published immediately without a reload', async () => {
    publishMock.mockResolvedValue({ message: 'مقاله با موفقیت منتشر شد' });

    await renderEditor();
    fireEvent.click(publishButton()!);

    await waitFor(() => expect(publishMock).toHaveBeenCalledWith(77));
    expect(publishMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(publishButton()).toBeNull());
    expect(toastSuccessMock).toHaveBeenCalledWith('مقاله با موفقیت منتشر شد');
    // Publish is its own action — no save, no navigation (no page reload).
    expect(updateMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    // The editor stays usable after publishing.
    expect(screen.getByText('ذخیره تغییرات')).not.toBeNull();
  });

  it('handles a 403 without corrupting the local draft state', async () => {
    publishMock.mockRejectedValue({
      response: { status: 403, data: { message: 'شما دسترسی لازم برای این عملیات را ندارید' } },
    });

    await renderEditor();
    fireEvent.click(publishButton()!);

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('شما دسترسی لازم برای این عملیات را ندارید'),
    );
    // Still a draft, still on the page, nothing saved or navigated by mistake.
    expect(publishButton()).not.toBeNull();
    expect(publishButton()!.disabled).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it('handles a 404 without corrupting the local draft state', async () => {
    publishMock.mockRejectedValue({
      response: { status: 404, data: { message: 'مقاله ای  یافت نشد' } },
    });

    await renderEditor();
    fireEvent.click(publishButton()!);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('مقاله ای  یافت نشد'));
    expect(publishButton()).not.toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('handles a generic 5xx with the fallback toast and keeps the draft editable', async () => {
    publishMock.mockRejectedValue({ response: { status: 500 } });

    await renderEditor();
    fireEvent.click(publishButton()!);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('خطا در انتشار مقاله'));
    expect(publishButton()).not.toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('creating a blog never publishes it and offers no publish action before save', async () => {
    createMock.mockResolvedValue({ message: 'ثبت شد' });
    params.slug = undefined;

    render(<BlogEditorPage />);

    fireEvent.change(screen.getByPlaceholderText('عنوانی جذاب برای مقاله (حداقل 10 کاراکتر)'), {
      target: { value: 'عنوان کاملاً آزمایشی برای تست' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('خلاصه‌ای کوتاه (10 تا 300 کاراکتر) که در کارت مقاله نمایش داده می‌شود'),
      { target: { value: 'خلاصه کاملاً آزمایشی برای تست' } },
    );
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('نام دسته‌بندی و Enter'), {
      target: { value: 'دسته‌بندی' },
    });
    fireEvent.click(screen.getByText('افزودن'));

    // No saved blog yet → no publish action exists at all.
    expect(publishButton()).toBeNull();

    fireEvent.click(screen.getByText('ثبت مقاله'));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'عنوان کاملاً آزمایشی برای تست' }),
    );
    expect(publishMock).not.toHaveBeenCalled();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/blog/my'));
  });
});
