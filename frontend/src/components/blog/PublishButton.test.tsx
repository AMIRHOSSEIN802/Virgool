import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublishButton from './PublishButton';

const { publishMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  publishMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/services/blog.service', () => ({
  blogService: { publish: publishMock },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: toastErrorMock },
}));

const button = () => screen.queryByTestId('publish-button') as HTMLButtonElement | null;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublishButton (R-02)', () => {
  it('is available for a draft blog and never fires on its own', () => {
    render(<PublishButton blogId={7} status="draft" onPublished={vi.fn()} />);

    expect(button()).not.toBeNull();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('is also available for a rejected blog', () => {
    render(<PublishButton blogId={7} status="reject" onPublished={vi.fn()} />);
    expect(button()).not.toBeNull();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('is not shown for an already-published blog', () => {
    render(<PublishButton blogId={7} status="published" onPublished={vi.fn()} />);
    expect(button()).toBeNull();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('sends exactly one request on click', async () => {
    publishMock.mockResolvedValue({ message: 'ok' });
    const onPublished = vi.fn();
    render(<PublishButton blogId={7} status="draft" onPublished={onPublished} />);

    fireEvent.click(button()!);

    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith(7);
  });

  it('is disabled while pending and a click storm cannot duplicate the request', async () => {
    let resolveRequest!: (value: unknown) => void;
    publishMock.mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    );
    render(<PublishButton blogId={7} status="draft" onPublished={vi.fn()} />);

    fireEvent.click(button()!);
    expect(button()!.disabled).toBe(true);

    fireEvent.click(button()!);
    fireEvent.click(button()!);
    expect(publishMock).toHaveBeenCalledTimes(1);

    resolveRequest({ message: 'ok' });
    await waitFor(() => expect(button()!.disabled).toBe(false));
    expect(publishMock).toHaveBeenCalledTimes(1);
  });

  it('reports success through the toast and hands control back to the parent', async () => {
    publishMock.mockResolvedValue({ message: 'مقاله با موفقیت منتشر شد' });
    const onPublished = vi.fn();
    const { rerender } = render(
      <PublishButton blogId={7} status="draft" onPublished={onPublished} />,
    );

    fireEvent.click(button()!);

    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
    expect(toastSuccessMock).toHaveBeenCalledWith('مقاله با موفقیت منتشر شد');
    expect(toastErrorMock).not.toHaveBeenCalled();

    // Parent flips the status → the action is no longer offered.
    rerender(<PublishButton blogId={7} status="published" onPublished={onPublished} />);
    expect(button()).toBeNull();
  });

  it('handles 403 without corrupting local state', async () => {
    publishMock.mockRejectedValue({
      response: { status: 403, data: { message: 'شما دسترسی لازم برای این عملیات را ندارید' } },
    });
    const onPublished = vi.fn();
    render(<PublishButton blogId={7} status="draft" onPublished={onPublished} />);

    fireEvent.click(button()!);

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('شما دسترسی لازم برای این عملیات را ندارید'),
    );
    expect(onPublished).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    // Still a draft, still actionable.
    expect(button()).not.toBeNull();
    expect(button()!.disabled).toBe(false);
  });

  it('handles 404 without corrupting local state', async () => {
    publishMock.mockRejectedValue({
      response: { status: 404, data: { message: 'مقاله ای  یافت نشد' } },
    });
    const onPublished = vi.fn();
    render(<PublishButton blogId={7} status="draft" onPublished={onPublished} />);

    fireEvent.click(button()!);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('مقاله ای  یافت نشد'));
    expect(onPublished).not.toHaveBeenCalled();
    expect(button()).not.toBeNull();
    expect(button()!.disabled).toBe(false);
  });

  it('falls back to a generic message for errors without one and stays retryable', async () => {
    publishMock.mockRejectedValueOnce({ response: { status: 500 } });
    const onPublished = vi.fn();
    render(<PublishButton blogId={7} status="draft" onPublished={onPublished} />);

    fireEvent.click(button()!);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('خطا در انتشار مقاله'));
    expect(onPublished).not.toHaveBeenCalled();
    expect(button()!.disabled).toBe(false);

    // The user can retry after a failure.
    publishMock.mockResolvedValueOnce({ message: 'ok' });
    fireEvent.click(button()!);
    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
    expect(publishMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces the first message when the backend returns an array of errors', async () => {
    publishMock.mockRejectedValue({
      response: { status: 400, data: { message: ['خطای اول', 'خطای دوم'] } },
    });
    render(<PublishButton blogId={7} status="draft" onPublished={vi.fn()} />);

    fireEvent.click(button()!);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('خطای اول'));
  });
});
