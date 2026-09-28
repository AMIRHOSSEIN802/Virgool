'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { blogService } from '@/services/blog.service';

interface PublishButtonProps {
  blogId: number;
  status: 'published' | 'draft' | 'reject';
  /** Invoked only after the backend confirmed the publish. */
  onPublished: () => void;
}

/**
 * R-02 — the explicit publish action for a blog the current user may edit.
 *
 * - Hidden when the blog is already Published (nothing left to do).
 * - One request at a time: the button disables while pending and a ref guards
 *   same-tick double clicks, so a click storm cannot send duplicate requests.
 * - On success the parent flips the status to Published (immediate UI update,
 *   no page reload) which unmounts this button.
 * - On failure (403 / 404 / 5xx) nothing local changes: the status stays as it
 *   was, the action becomes clickable again, and the backend message (or a
 *   generic fallback) is surfaced through the existing toast system.
 */
export default function PublishButton({ blogId, status, onPublished }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  // Closes the same-tick window before the `isPublishing` state re-renders.
  const inFlight = useRef(false);

  if (status === 'published') return null;

  const handlePublish = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPublishing(true);
    try {
      const res = await blogService.publish(blogId);
      toast.success(res.message);
      onPublished();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'خطا در انتشار مقاله');
    } finally {
      inFlight.current = false;
      setIsPublishing(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void handlePublish()}
      isLoading={isPublishing}
      data-testid="publish-button"
    >
      انتشار مقاله
    </Button>
  );
}
