import { getImageUrl } from '@/lib/constants';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

export default function Avatar({ src, alt = '', size = 'md', fallback }: AvatarProps) {
  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt.slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={getImageUrl(src)}
        alt={alt}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-[var(--surface)]`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-semibold ring-2 ring-[var(--surface)]`}
    >
      {initials || '?'}
    </div>
  );
}
