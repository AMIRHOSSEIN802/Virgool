'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userService } from '@/services/user.service';
import { blogService } from '@/services/blog.service';
import { BlogListBlog } from '@/types/blog.types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuth } from '@/hooks/useAuth';
import BlogCard from '@/components/blog/BlogCard';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { getImageUrl } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import Image from 'next/image';
import { UserPlus, UserCheck, ArrowRight, Users, UserCheck as UserCheckIcon } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

/**
 * Public author profile page (/profile/[username]).
 *
 * Backend contract (GET /user/by-username/:username):
 * { id, username, role, profile: {nick_name, bio, image_profile, bg_image},
 *   followersCount, followingCount, isFollowing }
 * Public endpoint — works for guests (isFollowing=false) and authenticated users.
 * 404 for a nonexistent username.
 */
export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { isAuthenticated } = useAuth();

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [likeStates, setLikeStates] = useState<Map<number, { liked: boolean; count: number }>>(new Map());

  const profileQuery = useAsyncData(
    () => userService.getPublicProfile(username),
    [username],
    { errorMessage: 'خطا در بارگذاری پروفایل' }
  );

  // Adopt server state on first load / username change.
  const profile = profileQuery.data;
  const profileIsFollowing = profile?.isFollowing ?? false;
  const profileFollowers = profile?.followersCount ?? 0;
  const adoptedKey = profile
    ? `${username}:${profile.isFollowing}:${profile.followersCount}`
    : null;
  const [adoptedKeyState, setAdoptedKeyState] = useState<string | null>(null);
  if (adoptedKey && adoptedKeyState !== adoptedKey) {
    setAdoptedKeyState(adoptedKey);
    setIsFollowing(profileIsFollowing);
    setFollowersCount(profileFollowers);
  }

  // Author blogs (public feed is published-only) ---------------------------
  const blogsQuery = useAsyncData<BlogListBlog[]>(
    async () => {
      const feed = await blogService.list({ limit: 50 });
      return feed.blogs.filter((b) => b.author?.username === username);
    },
    [username],
    { errorMessage: 'خطا در بارگذاری مقالات' }
  );

  const blogs = blogsQuery.data ?? [];

  const handleLikeChange = (blogId: number, liked: boolean, count: number) => {
    setLikeStates((prev) => {
      const next = new Map(prev);
      next.set(blogId, { liked, count });
      return next;
    });
  };

  const blogsForRender = blogs.map((b) => {
    const st = likeStates.get(b.id);
    return st ? { ...b, isLiked: st.liked, likeCount: st.count } : b;
  });

  // Follow/unfollow ----------------------------------------------------------
  const handleFollow = async () => {
    if (!profile) return;
    // Guests: the toggle endpoint requires auth (401) — send them to login instead.
    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent(`/profile/${username}`)}`);
      return;
    }
    setFollowBusy(true);
    // Optimistic UI; rollback on failure. The backend toggles.
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setFollowersCount((c) => Math.max(0, c + (nextFollowing ? 1 : -1)));
    try {
      await userService.toggleFollow(profile.id);
    } catch {
      setIsFollowing(!nextFollowing);
      setFollowersCount((c) => Math.max(0, c + (nextFollowing ? -1 : 1)));
      toast.error('خطا در انجام عملیات');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleFollowClick = () => {
    if (!profile) return;
    // Guests are redirected to login; the toggle itself requires auth (backend 401).
    handleFollow();
  };

  // Render -----------------------------------------------------------------
  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (profileQuery.status === 404) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ErrorState title="کاربر یافت نشد" message="چنین کاربری وجود ندارد یا حذف شده است." />
        <div className="flex justify-center mt-2">
          <Link href="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <ArrowRight className="h-4 w-4" />
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <ErrorState message={profileQuery.error || 'خطا در بارگذاری پروفایل'} onRetry={profileQuery.refetch} />
    );
  }

  const displayName = profile.profile.nick_name || profile.username;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Profile header */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="relative h-28 sm:h-40"
          style={
            profile.profile.bg_image
              ? undefined
              : { background: 'linear-gradient(120deg, var(--primary) 0%, var(--accent) 100%)' }
          }
        >
          {profile.profile.bg_image && (
            <Image
              src={getImageUrl(profile.profile.bg_image)}
              alt="کاور پروفایل"
              fill
              sizes="(max-width: 640px) 100vw, 896px"
              className="object-cover"
            />
          )}
        </div>

        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
            <div className="rounded-full p-1 shrink-0" style={{ background: 'var(--surface)' }}>
              <Avatar
                src={profile.profile.image_profile}
                alt={displayName}
                size="xl"
                fallback={displayName}
              />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </h1>
              <p className="text-sm mt-0.5" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>
                @{profile.username}
              </p>
            </div>
            <Button
              variant={isFollowing ? 'outline' : 'primary'}
              onClick={handleFollowClick}
              disabled={followBusy}
              className="shrink-0"
            >
              {isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4 ml-1.5" />
                  دنبال می‌کنید
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 ml-1.5" />
                  دنبال کردن
                </>
              )}
            </Button>
          </div>

          {profile.profile.bio && (
            <p className="mt-4 text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
              {profile.profile.bio}
            </p>
          )}

          {/* Follow stats — from the public endpoint */}
          <div className="flex items-center gap-6 mt-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Users className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(followersCount)}
              </span>
              دنبال‌کننده
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <UserCheckIcon className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatNumber(profile.followingCount)}
              </span>
              دنبال‌شده
            </span>
          </div>
        </div>
      </div>

      {/* Author blogs */}
      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          مقالات {displayName}
        </h2>
        {blogsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : blogsQuery.error ? (
          <ErrorState message={blogsQuery.error} onRetry={blogsQuery.refetch} />
        ) : blogsForRender.length === 0 ? (
          <EmptyState
            title="هنوز مقاله‌ای منتشر نشده"
            description="این نویسنده هنوز مقاله‌ای منتشر نکرده است"
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {blogsForRender.map((blog) => (
              <BlogCard key={blog.id} blog={blog} onLikeChange={handleLikeChange} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
