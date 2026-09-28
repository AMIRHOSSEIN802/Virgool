'use client';

import { sanitizeBlogHtml } from '@/lib/sanitize';

interface BlogContentProps {
  html: string;
}

/**
 * R-03 — the single rendering boundary for stored blog HTML.
 *
 * The API returns `content` verbatim and the editor round-trips it, so the
 * persisted string is treated as untrusted: it is sanitized with DOMPurify
 * here, immediately before `dangerouslySetInnerHTML`. Executable payloads can
 * never reach the DOM while the editor's legitimate formatting is kept.
 */
export default function BlogContent({ html }: BlogContentProps) {
  return (
    <div
      className="blog-content max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(html) }}
    />
  );
}
