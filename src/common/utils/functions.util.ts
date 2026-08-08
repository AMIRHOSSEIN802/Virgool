export const createSlug = (str: string): string => {
  return str
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
};

export const randomId = () => Math.random().toString(36).substring(2);
