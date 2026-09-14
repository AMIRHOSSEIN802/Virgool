'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getImageUrl } from '@/lib/constants';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

const sizes = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  // Profile header avatar: 72px on mobile, 80px on sm+ (rendered size is
  // CSS-driven; the width/height props below stay 80 for intrinsic sizing).
  xl: 'h-[72px] w-[72px] sm:h-20 sm:w-20 text-xl',
};

export default function Avatar({ src, alt = '', size = 'md', fallback }: AvatarProps) {
  const initials = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt.slice(0, 2).toUpperCase();

  // Resolve once; a falsy URL (missing/invalid legacy path) falls back to initials
  // instead of rendering <Image src=""> which Next.js rejects.
  const url = src ? getImageUrl(src) : '';

  // A stored path can still fail to load (file deleted from disk, corrupt
  // upload, 404). Degrade to the initials fallback instead of a broken img.
  // Render-time state adjustment (React-recommended, no effect): reset the
  // failure flag whenever the resolved URL changes.
  const [failed, setFailed] = useState(false);
  const [failedFor, setFailedFor] = useState(url);
  if (failedFor !== url) {
    setFailedFor(url);
    setFailed(false);
  }

  if (url && !failed) {
    return (
      <Image
        src={url}
        alt={alt}
        width={sizes[size]}
        height={sizes[size]}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-[var(--surface)]`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-semibold ring-2 ring-[var(--surface)]`}
    >
      {initials || '?'}
    </div>
  );
}
