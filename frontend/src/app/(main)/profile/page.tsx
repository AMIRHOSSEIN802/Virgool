'use client';

import { userService } from '@/services/user.service';
import { ProfileWithCounts } from '@/types/auth.types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileForm from '@/components/profile/ProfileForm';
import AuthGuard from '@/components/auth/AuthGuard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Mail, Phone, AtSign, X } from 'lucide-react';

function ProfileContent() {
  const profileQuery = useAsyncData<ProfileWithCounts>(
    () => userService.getProfile(),
    [],
    { errorMessage: 'خطا در بارگذاری پروفایل' }
  );
  const profile = profileQuery.data;
  const fetchProfile = profileQuery.refetch;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTarget, setOtpTarget] = useState<'email' | 'phone' | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [usernameValue, setUsernameValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = async (field: 'image_profile' | 'bg_image', file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر باید کمتر از 5 مگابایت باشد');
      return;
    }
    try {
      await userService.updateProfileImage(field, file);
      toast.success('تصویر بروزرسانی شد');
      fetchProfile();
    } catch {
      toast.error('خطا در آپلود تصویر');
    }
  };

  const handleChangeEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      toast.error('ایمیل معتبر وارد کنید');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await userService.changeEmail(emailValue.trim());
      if (result.code) {
        setOtpTarget('email');
        setShowEmailModal(false);
        toast.success('کد تایید ارسال شد');
      } else {
        toast.success((result as { message?: string }).message || 'ایمیل بروزرسانی شد');
        setShowEmailModal(false);
        fetchProfile();
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در تغییر ایمیل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePhone = async () => {
    if (!/^09\d{9}$/.test(phoneValue.trim())) {
      toast.error('شماره موبایل معتبر وارد کنید');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await userService.changePhone(phoneValue.trim());
      if (result.code) {
        setOtpTarget('phone');
        setShowPhoneModal(false);
        toast.success('کد تایید ارسال شد');
      } else {
        toast.success('شماره بروزرسانی شد');
        setShowPhoneModal(false);
        fetchProfile();
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در تغییر شماره');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeUsername = async () => {
    if (usernameValue.trim().length < 3) {
      toast.error('نام کاربری باید حداقل 3 کاراکتر باشد');
      return;
    }
    setIsSubmitting(true);
    try {
      await userService.changeUsername(usernameValue.trim());
      toast.success('نام کاربری بروزرسانی شد');
      setShowUsernameModal(false);
      fetchProfile();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'خطا در تغییر نام کاربری');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpTarget || otpCode.length !== 5) {
      toast.error('کد 5 رقمی را وارد کنید');
      return;
    }
    setIsSubmitting(true);
    try {
      if (otpTarget === 'email') {
        await userService.verifyEmailOtp(otpCode);
      } else {
        await userService.verifyPhoneOtp(otpCode);
      }
      toast.success('با موفقیت تایید شد');
      setOtpTarget(null);
      setOtpCode('');
      fetchProfile();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'کد نادرست است');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <LoadingSkeleton type="profile" />
        <div className="mt-6">
          <LoadingSkeleton type="list" />
        </div>
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return <ErrorState message={profileQuery.error || 'خطا در بارگذاری پروفایل'} onRetry={fetchProfile} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ProfileHeader profile={profile} isOwn />

      {/* Account Settings */}
      <section className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>تنظیمات حساب</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingButton icon={<Camera className="h-5 w-5" />} title="تصاویر پروفایل" subtitle="تصویر پروفایل و کاور" onClick={() => setShowEditModal(true)} />
          <SettingButton icon={<Mail className="h-5 w-5" />} title="ایمیل" subtitle={profile.email || 'ثبت نشده'} onClick={() => setShowEmailModal(true)} />
          <SettingButton icon={<Phone className="h-5 w-5" />} title="شماره موبایل" subtitle={profile.phone || 'ثبت نشده'} onClick={() => setShowPhoneModal(true)} />
          <SettingButton icon={<AtSign className="h-5 w-5" />} title="نام کاربری" subtitle={`@${profile.username}`} onClick={() => { setUsernameValue(profile.username); setShowUsernameModal(true); }} />
        </div>
      </section>

      {/* Profile Edit */}
      <section className="rounded-2xl p-5 shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>ویرایش اطلاعات</h2>
        <ProfileForm onSaved={fetchProfile} />
      </section>

      {/* Image Upload Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="تغییر تصاویر">
        <div className="space-y-5">
          <FileField label="تصویر پروفایل" accept="image/png,image/jpeg" onPick={(f) => handleImageUpload('image_profile', f)} />
          <FileField label="تصویر کاور" accept="image/png,image/jpeg" onPick={(f) => handleImageUpload('bg_image', f)} />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>فرمت‌های مجاز: JPG و PNG — حداکثر 5 مگابایت</p>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="تغییر ایمیل">
        <div className="space-y-4">
          <Input
            label="ایمیل جدید"
            type="email"
            dir="ltr"
            className="text-left"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="example@email.com"
          />
          <Button onClick={handleChangeEmail} isLoading={isSubmitting} className="w-full">ثبت و ارسال کد</Button>
        </div>
      </Modal>

      {/* Phone Modal */}
      <Modal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} title="تغییر شماره موبایل">
        <div className="space-y-4">
          <Input
            label="شماره موبایل جدید"
            type="tel"
            dir="ltr"
            inputMode="numeric"
            className="text-left"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder="09123456789"
          />
          <Button onClick={handleChangePhone} isLoading={isSubmitting} className="w-full">ثبت و ارسال کد</Button>
        </div>
      </Modal>

      {/* Username Modal */}
      <Modal isOpen={showUsernameModal} onClose={() => setShowUsernameModal(false)} title="تغییر نام کاربری">
        <div className="space-y-4">
          <Input
            label="نام کاربری جدید"
            dir="ltr"
            className="text-left"
            value={usernameValue}
            onChange={(e) => setUsernameValue(e.target.value)}
            placeholder="username"
          />
          <Button onClick={handleChangeUsername} isLoading={isSubmitting} className="w-full">ثبت</Button>
        </div>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        isOpen={!!otpTarget}
        onClose={() => { setOtpTarget(null); setOtpCode(''); }}
        title="تایید کد"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            کد 5 رقمی ارسال‌شده را وارد کنید
          </p>
          <Input
            label="کد تایید"
            inputMode="numeric"
            maxLength={5}
            className="text-center tracking-[0.5em] text-lg"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="- - - - -"
          />
          <Button onClick={handleVerifyOtp} isLoading={isSubmitting} className="w-full">تایید</Button>
        </div>
      </Modal>
    </div>
  );
}

function SettingButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-xl text-right transition-colors hover:bg-[var(--surface-hover)]"
      style={{ border: '1px solid var(--border)' }}
    >
      <span className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{subtitle}</span>
      </span>
    </button>
  );
}

function FileField({ label, accept, onPick }: { label: string; accept: string; onPick: (f: File) => void }) {
  const [fileName, setFileName] = useState('');
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <label
          className="flex-1 cursor-pointer text-sm px-3 py-2.5 rounded-xl border transition-colors hover:bg-[var(--surface-hover)] truncate"
          style={{ borderColor: 'var(--border)', color: fileName ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
        >
          {fileName || 'انتخاب فایل...'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileName(file.name);
                onPick(file);
              }
            }}
          />
        </label>
        {fileName && <X className="h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
