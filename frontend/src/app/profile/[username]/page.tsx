'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { blogService } from '@/services/blog.service';
import { ProfileWithCounts } from '@/types/auth.types';
import { BlogListBlog } from '@/types/blog.types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import BlogCard from '@/components/blog/BlogCard';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { UserPlus, UserMinus } from 'lucide-react';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileWithCounts | null>(null);
  const [blogs, setBlogs] = useState<BlogListBlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // We need to get the user list to find the user by username
        // since there's no public profile by username endpoint
        const users = await userService.listUsers();
        const foundUser = users.find((u) => u.username === username);
        if (!foundUser) {
          setError('کاربر یافت نشد');
          setIsLoading(false);
          return;
        }

        // Get own profile if viewing own profile
        if (currentUser?.username === username) {
          const ownProfile = await userService.getProfile();
          setProfile(ownProfile);
        }

        // Get blogs
        const blogsData = await blogService.list({ limit: 20 });
        const userBlogs = blogsData.blogs.filter(
          (b) => b.author?.username === username
        );
        setBlogs(userBlogs);
      } catch {
        setError('خطا در بارگذاری پروفایل');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      await userService.toggleFollow(profile.id);
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'از لیست دنبال شوندگان حذف شد' : 'با موفقیت دنبال شد');
    } catch {
      toast.error('خطا در انجام عملیات');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!profile) return <ErrorState message="کاربر یافت نشد" />;

  const isOwnProfile = currentUser?.username === username;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <ProfileHeader profile={profile} isOwn={isOwnProfile} />
        {!isOwnProfile && currentUser && (
          <Button
            variant={isFollowing ? 'outline' : 'primary'}
            onClick={handleFollow}
            className="mt-4"
          >
            {isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 ml-2" />
                دنبال نکردن
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 ml-2" />
                دنبال کردن
              </>
            )}
          </Button>
        )}
      </div>

      {/* User's Blogs */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>مقالات</h2>
        {blogs.length === 0 ? (
          <EmptyState title="هنوز مقاله‌ای ندارد" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
