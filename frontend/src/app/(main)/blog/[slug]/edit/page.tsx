'use client';

// The edit route reuses the create page component — the presence of the
// `slug` route param switches the editor into edit mode.
import BlogEditorPage from '@/app/(main)/blog/create/page';

export default function BlogEditPage() {
  return <BlogEditorPage />;
}
