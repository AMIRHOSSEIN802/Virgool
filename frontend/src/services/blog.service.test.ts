import { describe, it, expect, vi, beforeEach } from 'vitest';

const { postMock, getMock, putMock, deleteMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  default: { post: postMock, get: getMock, put: putMock, delete: deleteMock },
}));

import { blogService } from '@/services/blog.service';

describe('blogService.publish (R-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /blog/:id/publish exactly once and returns the response body', async () => {
    const body = { message: 'مقاله با موفقیت منتشر شد' };
    postMock.mockResolvedValue({ data: body });

    const result = await blogService.publish(42);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/blog/42/publish');
    expect(result).toEqual(body);
  });

  it('propagates the backend error untouched so the UI can react', async () => {
    const error = { response: { status: 403, data: { message: 'دسترسی غیر مجاز' } } };
    postMock.mockRejectedValue(error);

    await expect(blogService.publish(7)).rejects.toBe(error);
    expect(postMock).toHaveBeenCalledWith('/blog/7/publish');
  });
});
