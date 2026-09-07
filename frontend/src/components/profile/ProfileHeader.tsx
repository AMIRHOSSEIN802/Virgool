'use client';

import { ProfileWithCounts } from '@/types/auth.types';
import { getImageUrl } from '@/lib/constants';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import { MapPin, LinkIcon, Calendar, Edit } from 'lucide-react';

interface ProfileHeaderProps {
  profile: ProfileWithCounts;
  isOwn?: boolean;
}

export default function ProfileHeader({ profile, isOwn }: ProfileHeaderProps) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--surface)' }}>
      {/* Cover Image */}
      <div className="relative h-32 sm:h-48 bg-gradient-to-l from-indigo-500 to-purple-600">
        {profile.profile?.bg_image && (
          <img
            src={getImageUrl(profile.profile.bg_image)}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 sm:-mt-12">
          <Avatar
            src={profile.profile?.image_profile}
            alt={profile.profile?.nick_name || profile.username}
            size="xl"
            fallback={profile.profile?.nick_name || profile.username}
          />
          <div className="flex-1 pt-2 sm:pt-0">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {profile.profile?.nick_name || profile.username}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>@{profile.username}</p>
          </div>
          {isOwn && (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm hover:bg-[var(--surface-hover)]"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <Edit className="h-4 w-4" />
              ویرایش پروفایل
            </Link>
          )}
        </div>

        {/* Bio */}
        {profile.profile?.bio && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <Link
            href="/profile/following"
            className="text-sm hover:text-[var(--primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(profile.followingCount)}</span> دنبال شونده
          </Link>
          <Link
            href="/profile/followers"
            className="text-sm hover:text-[var(--primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(profile.followersCount)}</span> دنبال‌کننده
          </Link>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-4 mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {profile.email && (
            <span className="flex items-center gap-1">
              📧 {profile.email}
            </span>
          )}
          {profile.profile?.linkedin_profile && (
            <a
              href={profile.profile.linkedin_profile}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--primary)]"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          )}
          {profile.profile?.x_profile && (
            <a
              href={profile.profile.x_profile}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--primary)]"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              X
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
