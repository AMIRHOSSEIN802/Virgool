'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Link2, Pencil, UserCheck, Users } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { getImageUrl } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/utils';

/**
 * Shared profile header for /profile and /profile/[username] — one component,
 * one visual language (Twitter/X-style density, without copying either).
 *
 * Hierarchy:
 *   Cover (h-32 mobile / h-40 desktop)
 *   → Avatar overlapping the boundary (ONLY the avatar crosses it)
 *   → Identity (name + @username + bio) beside the avatar on sm+
 *   → Stats (inline, lightweight) + primary action
 *   → Meta (own profile only)
 *
 * Dead-space rules:
 * - The identity column starts AT the cover boundary (no pt clearing — the
 *   avatar overlaps upward via its own negative margin, nothing else does).
 * - Desktop action sits in the identity row; mobile drops it below stats.
 */
const AVATAR_PULL = '-mt-10 sm:-mt-12';

interface ProfileHeaderProps {
  username: string;
  nickName?: string | null;
  bio?: string | null;
  avatarPath?: string | null;
  coverPath?: string | null;
  followersCount: number;
  followingCount: number;
  birthday?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  /** Renders the "ویرایش پروفایل" link (own profile). */
  isOwn?: boolean;
  /** Optional explicit hrefs for the stat links (own profile). */
  followersHref?: string;
  followingHref?: string;
  /** Primary action (follow button on public profiles; edit link default). */
  action?: ReactNode;
}

function ProfileStat({
  icon,
  value,
  label,
  href,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  href?: string;
}) {
  const inner = (
    <>
      {icon}
      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {formatNumber(value)}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
    </>
  );

  const className =
    'inline-flex items-center gap-1.5 rounded-lg px-2 -mx-2 py-1 transition-colors' +
    (href ? ' hover:bg-[var(--surface-hover)]' : '');

  return href ? (
    <Link href={href} className={className} aria-label={`${label}: ${value}`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function ProfileHeader({
  username,
  nickName,
  bio,
  avatarPath,
  coverPath,
  followersCount,
  followingCount,
  birthday,
  linkedinUrl,
  xUrl,
  isOwn,
  followersHref,
  followingHref,
  action,
}: ProfileHeaderProps) {
  const displayName = nickName || username;
  const coverUrl = getImageUrl(coverPath);
  const hasMeta = !!(birthday || linkedinUrl || xUrl);
  const absoluteLink = (value: string | null | undefined) =>
    value ? (value.startsWith('http') ? value : `https://${value}`) : null;

  const defaultAction = (
    <Link
      href="/profile"
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
      style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      <Pencil className="h-4 w-4" />
      ویرایش پروفایل
    </Link>
  );
  const actionNode = action ?? (isOwn ? defaultAction : null);

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Cover — consistent height per breakpoint, object-cover, gradient fallback. */}
      <div
        className="relative h-32 sm:h-40"
        style={
          coverUrl
            ? undefined
            : { background: 'linear-gradient(120deg, var(--primary) 0%, var(--accent) 100%)' }
        }
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

      <div className="px-4 sm:px-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Avatar — the only element crossing the cover boundary. */}
          <div
            className={`relative z-10 self-start shrink-0 rounded-full p-1.5 ${AVATAR_PULL}`}
            style={{ background: 'var(--surface)' }}
          >
            <Avatar src={avatarPath} alt={displayName} size="xl" fallback={displayName} />
          </div>

          {/* Identity — starts exactly at the cover edge on sm+; compact block. */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-lg sm:text-xl font-bold truncate leading-7 sm:leading-8"
              style={{ color: 'var(--text-primary)' }}
              title={displayName}
            >
              {displayName}
            </h1>
            <p
              dir="ltr"
              className="text-sm truncate text-right leading-5"
              style={{ color: 'var(--text-tertiary)' }}
              title={`@${username}`}
            >
              @{username}
            </p>
            {bio && (
              <p
                className="mt-1.5 max-w-prose text-sm leading-6 break-words whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}
              >
                {bio}
              </p>
            )}
            {/* Stats + mobile action */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <ProfileStat
                icon={<Users className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--primary)' }} />}
                value={followersCount}
                label="دنبال‌کننده"
                href={followersHref}
              />
              <ProfileStat
                icon={<UserCheck className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--primary)' }} />}
                value={followingCount}
                label="دنبال‌شونده"
                href={followingHref}
              />
              {actionNode && <div className="w-full sm:hidden">{actionNode}</div>}
            </div>
          </div>

          {/* Desktop action — top of the identity row, aligned with the name. */}
          {actionNode && <div className="hidden sm:flex self-start shrink-0 ms-auto">{actionNode}</div>}
        </div>

        {/* Meta (own profile extras) */}
        {hasMeta && (
          <div
            className="mt-3.5 pt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {birthday && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                {formatDate(birthday)}
              </span>
            )}
            {absoluteLink(linkedinUrl) && (
              <a
                href={absoluteLink(linkedinUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[var(--primary)] hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" />
                لینکدین
              </a>
            )}
            {absoluteLink(xUrl) && (
              <a
                href={absoluteLink(xUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[var(--primary)] hover:underline"
              >
                X (توییتر)
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
