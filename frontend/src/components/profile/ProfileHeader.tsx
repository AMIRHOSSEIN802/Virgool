'use client';

import { ProfileWithCounts } from '@/types/auth.types';
import { getImageUrl } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Pencil, Users, UserCheck } from 'lucide-react';

interface ProfileHeaderProps {
  profile: ProfileWithCounts;
  isOwn?: boolean;
}

export default function ProfileHeader({ profile, isOwn }: ProfileHeaderProps) {
  const displayName = profile.profile?.nick_name || profile.username;
  const cover = profile.profile?.bg_image;

  const coverUrl = getImageUrl(cover);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Cover */}
      {/* Resolve once: an invalid legacy path yields "" and the gradient fallback
          renders instead of <Image src=""> which Next.js rejects. */}
      <div
        className="relative h-32 sm:h-44"
        style={{
          background: coverUrl
            ? undefined
            : 'linear-gradient(120deg, var(--primary) 0%, var(--accent) 100%)',
        }}
      >
        {coverUrl && (
          <Image
            src={coverUrl}
            alt="کاور پروفایل"
            fill
            sizes="(max-width: 640px) 100vw, 896px"
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Info */}
      <div className="relative px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
          <div className="rounded-full p-1 shrink-0" style={{ background: 'var(--surface)' }}>
            <Avatar src={profile.profile?.image_profile} alt={displayName} size="xl" fallback={displayName} />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </h1>
            <p className="text-sm mt-0.5" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>
              @{profile.username}
            </p>
          </div>
          {isOwn && (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <Pencil className="h-4 w-4" />
              ویرایش پروفایل
            </Link>
          )}
        </div>

        {/* Bio */}
        {profile.profile?.bio && (
          <p className="mt-4 text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
            {profile.profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <Link href="/profile/followers" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <Users className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(profile.followersCount)}</span>
            دنبال‌کننده
          </Link>
          <Link href="/profile/following" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <UserCheck className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(profile.followingCount)}</span>
            دنبال‌شده
          </Link>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {profile.profile?.birthday && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {profile.profile.birthday.split('T')[0]}
            </span>
          )}
          {profile.profile?.linkedin_profile && (
            <a
              href={profile.profile.linkedin_profile.startsWith('http') ? profile.profile.linkedin_profile : `https://${profile.profile.linkedin_profile}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--primary)] hover:underline"
            >
              LinkedIn
            </a>
          )}
          {profile.profile?.x_profile && (
            <a
              href={profile.profile.x_profile.startsWith('http') ? profile.profile.x_profile : `https://${profile.profile.x_profile}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--primary)] hover:underline"
            >
              X (توییتر)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
