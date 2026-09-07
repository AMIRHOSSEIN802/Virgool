'use client';

import Link from 'next/link';
import { FollowEntity } from '@/types/follow.types';
import Avatar from '@/components/ui/Avatar';

interface UserCardProps {
  user: {
    id: number;
    username: string;
    profile?: {
      nick_name: string;
      bio: string | null;
      image_profile: string | null;
    };
  };
}

export default function UserCard({ user }: UserCardProps) {
  const displayName = user.profile?.nick_name || user.username;

  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-center gap-3 p-4 rounded-xl hover:shadow-md transition-shadow"
      style={{ background: 'var(--surface)' }}
    >
      <Avatar
        src={user.profile?.image_profile}
        alt={displayName}
        size="lg"
        fallback={displayName}
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</h3>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>@{user.username}</p>
        {user.profile?.bio && (
          <p className="text-xs truncate mt-1" style={{ color: 'var(--text-tertiary)' }}>{user.profile.bio}</p>
        )}
      </div>
    </Link>
  );
}
