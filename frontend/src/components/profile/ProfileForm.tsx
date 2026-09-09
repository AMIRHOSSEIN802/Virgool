'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { ProfileDto } from '@/types/auth.types';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ProfileFormProps {
  onSaved?: () => void;
}

export default function ProfileForm({ onSaved }: ProfileFormProps) {
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

  // Seed the form from the loaded user (render-time state adjustment keyed on
  // the user id — the React-recommended alternative to setState in effects).
  const [seededUserId, setSeededUserId] = useState<number | null>(null);
  const userId = user?.id ?? null;
  if (userId !== seededUserId) {
    setSeededUserId(userId);
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nick_name?.trim()) {
      toast.error('نام مستعار را وارد کنید');
      return;
    }
    setIsLoading(true);
    try {
      // Only send non-empty fields so the backend does not wipe existing values.
      const payload: ProfileDto = { nick_name: formData.nick_name.trim() };
      if (formData.bio?.trim()) payload.bio = formData.bio.trim();
      if (formData.gender) payload.gender = formData.gender;
      if (formData.birthday) payload.birthday = formData.birthday;
      if (formData.linkedin_profile?.trim()) payload.linkedin_profile = formData.linkedin_profile.trim();
      if (formData.x_profile?.trim()) payload.x_profile = formData.x_profile.trim();

      await userService.updateProfile(payload);
      toast.success('پروفایل بروزرسانی شد');
      onSaved?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در بروزرسانی پروفایل');
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass =
    'w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';
  const selectStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--surface)' };

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
        placeholder="چند جمله‌ای درباره خودتان بنویسید..."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>جنسیت</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className={selectClass}
            style={selectStyle}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="لینک LinkedIn"
          dir="ltr"
          className="text-left"
          value={formData.linkedin_profile}
          onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
          placeholder="https://linkedin.com/in/..."
        />
        <Input
          label="لینک X (توییتر)"
          dir="ltr"
          className="text-left"
          value={formData.x_profile}
          onChange={(e) => setFormData({ ...formData, x_profile: e.target.value })}
          placeholder="https://x.com/..."
        />
      </div>
      <Button type="submit" isLoading={isLoading}>
        ذخیره تغییرات
      </Button>
    </form>
  );
}
