'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { ProfileDto, ProfileWithCounts } from '@/types/auth.types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ProfileForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileDto>({
    nick_name: '',
    bio: '',
    gender: '',
    birthday: '',
    linkedin_profile: '',
    x_profile: '',
  });

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        nick_name: user.profile.nick_name || '',
        bio: user.profile.bio || '',
        gender: user.profile.gender || '',
        birthday: user.profile.birthday ? user.profile.birthday.split('T')[0] : '',
        linkedin_profile: user.profile.linkedin_profile || '',
        x_profile: user.profile.x_profile || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await userService.updateProfile(formData);
      toast.success('پروفایل با موفقیت بروزرسانی شد');
    } catch {
      toast.error('خطا در بروزرسانی پروفایل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="نام مستعار"
        value={formData.nick_name}
        onChange={(e) => setFormData({ ...formData, nick_name: e.target.value })}
        required
      />
      <Textarea
        label="درباره من"
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
        rows={3}
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>جنسیت</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">انتخاب کنید</option>
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
            <option value="سایر">سایر</option>
          </select>
        </div>
        <Input
          label="تاریخ تولد"
          type="date"
          value={formData.birthday}
          onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
        />
      </div>
      <Input
        label="لینک LinkedIn"
        value={formData.linkedin_profile}
        onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
        placeholder="https://linkedin.com/in/..."
      />
      <Input
        label="لینک X (Twitter)"
        value={formData.x_profile}
        onChange={(e) => setFormData({ ...formData, x_profile: e.target.value })}
        placeholder="https://x.com/..."
      />
      <Button type="submit" isLoading={isLoading}>
        ذخیره تغییرات
      </Button>
    </form>
  );
}
