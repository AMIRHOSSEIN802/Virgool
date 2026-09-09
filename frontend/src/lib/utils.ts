const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits in a string/number to Persian digits. */
export const toPersianDigits = (value: string | number): string => {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
};

/** Format a date as a Persian (Jalali) relative or absolute string. */
export const formatDate = (date: string | Date): string => {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(date);
  }
};

/** Relative time in Persian, e.g. «۳ روز پیش». */
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    const diffMs = d.getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(days, 'day');
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(months, 'month');
    return rtf.format(Math.round(months / 12), 'year');
  } catch {
    return String(date);
  }
};

export const createSlug = (text: string): string => {
  return text
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
};

export const formatNumber = (num: number): string => {
  const n = Number(num) || 0;
  if (n >= 1000000) return toPersianDigits((n / 1000000).toFixed(1)) + 'M';
  if (n >= 1000) return toPersianDigits((n / 1000).toFixed(1)) + 'K';
  return toPersianDigits(n);
};
