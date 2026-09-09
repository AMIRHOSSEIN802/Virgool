export const API_BASE_URL = '/api';

/**
 * Absolute base for backend-hosted uploads.
 * NEXT_PUBLIC_API_ORIGIN overrides the localhost default for production
 * deployments where the NestJS backend lives on a different origin.
 */
export const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/+$/, '') || 'http://localhost:3000';

/**
 * Build a loadable URL for a backend-stored image path.
 * The backend stores Windows-style paths ("uploads\user-profile\x.png") —
 * normalize separators so the URL is valid everywhere (SSR, next/image, CDN).
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path.replace(/\\/g, '/');
  return `${IMAGE_BASE_URL}/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};
