'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { ProfileWithCounts } from '@/types/auth.types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileForm from '@/components/profile/ProfileForm';
import AuthGuard from '@/components/auth/AuthGuard';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Camera, Mail, Phone, AtSign } from 'lucide-react';

function ProfileContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileWithCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTarget, setOtpTarget] = useState<'email' | 'phone' | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [usernameValue, setUsernameValue] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [bgImage, setBgImage] = useState<File | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getProfile();
      setProfile(data);
    } catch {
      setError('خطا در بارگذاری پروفایل');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = async (field: 'image_profile' | 'bg_image', file: File) => {
    try {
      await userService.updateProfileImage(field, file);
      toast.success('تصویر با موفقیت بروزرسانی شد');
      fetchProfile();
    } catch {
      toast.error('خطا در آپلود تصویر');
    }
  };

  const handleChangeEmail = async () => {
    try {
      const result = await userService.changeEmail(emailValue);
      if (result.code) {
        setOtpTarget('email');
        setShowEmailModal(false);
        toast.success('کد تایید به ایمیل جدید ارسال شد');
      } else {
        toast.success('ایمیل بروزرسانی شد');
        setShowEmailModal(false);
        fetchProfile();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در تغییر ایمیل');
    }
  };

  const handleChangePhone = async () => {
    try {
      const result = await userService.changePhone(phoneValue);
      if (result.code) {
        setOtpTarget('phone');
        setShowPhoneModal(false);
        toast.success('کد تایید به شماره جدید ارسال شد');
      } else {
        toast.success('شماره بروزرسانی شد');
        setShowPhoneModal(false);
        fetchProfile();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در تغییر شماره');
    }
  };

  const handleChangeUsername = async () => {
    try {
      await userService.changeUsername(usernameValue);
      toast.success('نام کاربری بروزرسانی شد');
      setShowUsernameModal(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در تغییر نام کاربری');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpTarget) return;
    try {
      if (otpTarget === 'email') {
        await userService.verifyEmailOtp(otpCode);
      } else {
        await userService.verifyPhoneOtp(otpCode);
      }
      toast.success('تایید شد');
      setOtpTarget(null);
      setOtpCode('');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'کد نادرست است');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return <ErrorState message={error || 'خطا در بارگذاری پروفایل'} onRetry={fetchProfile} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ProfileHeader profile={profile} isOwn />

      {/* Quick Actions */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--surface)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>تنظیمات حساب کاربری</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', background: 'var(--surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <Camera className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>تصویر پروفایل</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>تغییر تصویر پروفایل و کاور</p>
            </div>
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', background: 'var(--surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <Mail className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>ایمیل</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.email || 'تایید نشده'}</p>
            </div>
          </button>
          <button
            onClick={() => setShowPhoneModal(true)}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', background: 'var(--surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <Phone className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>شماره موبایل</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.phone || 'تایید نشده'}</p>
            </div>
          </button>
          <button
            onClick={() => setShowUsernameModal(true)}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px', background: 'var(--surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <AtSign className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>نام کاربری</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{profile.username}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Profile Edit */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--surface)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>ویرایش اطلاعات</h2>
        <ProfileForm />
      </div>

      {/* Image Upload Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="تغییر تصویر">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>تصویر پروفایل</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload('image_profile', file);
              }}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>تصویر کاور</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload('bg_image', file);
              }}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface)' }}
            />
          </div>
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="تغییر ایمیل">
        <div className="space-y-4">
          <Input
            label="ایمیل جدید"
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="example@email.com"
          />
          <Button onClick={handleChangeEmail} className="w-full">
            تایید
          </Button>
        </div>
      </Modal>

      {/* Phone Modal */}
      <Modal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} title="تغییر شماره موبایل">
        <div className="space-y-4">
          <Input
            label="شماره موبایل جدید"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder="09123456789"
          />
          <Button onClick={handleChangePhone} className="w-full">
            تایید
          </Button>
        </div>
      </Modal>

      {/* Username Modal */}
      <Modal isOpen={showUsernameModal} onClose={() => setShowUsernameModal(false)} title="تغییر نام کاربری">
        <div className="space-y-4">
          <Input
            label="نام کاربری جدید"
            value={usernameValue}
            onChange={(e) => setUsernameValue(e.target.value)}
            placeholder="username"
          />
          <Button onClick={handleChangeUsername} className="w-full">
            تایید
          </Button>
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
            کد تایید ارسال شده را وارد کنید
          </p>
          <Input
            label="کد تایید"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="12345"
            maxLength={5}
          />
          <Button onClick={handleVerifyOtp} className="w-full">
            تایید
          </Button>
        </div>
      </Modal>
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
