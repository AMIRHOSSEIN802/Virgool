export const API_BASE_URL = '/api';

export const IMAGE_BASE_URL = 'http://localhost:3000';

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IMAGE_BASE_URL}/${path}`;
};
