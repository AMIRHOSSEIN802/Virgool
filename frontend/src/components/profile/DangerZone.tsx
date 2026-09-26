'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Account deletion (danger zone).
 *
 * The account is only deleted after the user retypes their own username —
 * the typed value must match exactly, and the same confirmation is sent to
 * the backend, which re-validates it against the database row. On success the
 * session is dropped (logout) and the visitor is sent back to the home page.
 */
export default function DangerZone({ username }: { username: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const matches = confirmValue.trim() === username;

  const openModal = () => {
    setConfirmValue('');
    setIsOpen(true);
  };

  const closeModal = () => {
    // Keep the modal closed only while no deletion is in flight.
    if (isDeleting) return;
    setIsOpen(false);
    setConfirmValue('');
  };

  const handleDelete = async () => {
    if (!matches || isDeleting) return;
    setIsDeleting(true);
    try {
      const { message } = await userService.deleteAccount(username);
      toast.success(message || 'حساب کاربری شما حذف شد');
      logout();
      router.push('/');
    } catch (err: unknown) {
      const backendMessage = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      toast.error(backendMessage || 'خطا در حذف حساب کاربری');
      setIsDeleting(false);
    }
  };

  return (
    <section
      className="rounded-2xl p-5 shadow-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--error)' }}
      data-testid="danger-zone"
    >
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-5 w-5" style={{ color: 'var(--error)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--error)' }}>
          ناحیه خطر
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        حذف حساب کاربری غیرقابل بازگشت است؛ پست‌ها، نظرات، لایک‌ها و سایر
        اطلاعات شما برای همیشه حذف می‌شوند.
      </p>
      <Button variant="danger" onClick={openModal} data-testid="open-delete-modal">
        حذف حساب کاربری
      </Button>

      <Modal isOpen={isOpen} onClose={closeModal} title="حذف دائمی حساب کاربری">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            با حذف حساب، این عملیات غیرقابل بازگشت خواهد بود. برای تایید، نام
            کاربری خود را دقیقاً وارد کنید:
          </p>
          <p className="text-sm font-bold" dir="ltr" style={{ color: 'var(--text-primary)' }}>
            @{username}
          </p>
          <Input
            label="نام کاربری"
            dir="ltr"
            className="text-left"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder={username}
            autoComplete="off"
            data-testid="confirm-username-input"
          />
          <Button
            variant="danger"
            className="w-full"
            onClick={handleDelete}
            disabled={!matches}
            isLoading={isDeleting}
            data-testid="confirm-delete-button"
          >
            حذف دائمی حساب
          </Button>
        </div>
      </Modal>
    </section>
  );
}
