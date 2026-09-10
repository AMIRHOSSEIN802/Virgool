export const API_BASE_URL = '/api';

/**
 * Absolute base for backend-hosted uploads.
 * NEXT_PUBLIC_API_ORIGIN overrides the localhost default for production
 * deployments where the NestJS backend lives on a different origin.
 */
export const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/+$/, '') || 'http://localhost:3000';

/**
 * Build a loadable URL for a backend-stored image path, or "" when the path is
 * not a usable image (null/empty/corrupted values such as "{}" from legacy data).
 * The backend stores Windows-style paths ("uploads\user-profile\x.png") —
 * separators are normalized so the URL is valid everywhere (SSR, next/image).
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/').trim();
  // Corrupted legacy values ("{}") or paths without an image extension would 404
  // and render as broken images — treat them as "no image" so callers fall back.
  if (!normalized || !/\.(png|jpe?g|webp|gif)$/i.test(normalized)) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${IMAGE_BASE_URL}/${normalized.replace(/^\/+/, '')}`;
};
