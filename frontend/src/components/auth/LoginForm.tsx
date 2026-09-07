'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const phoneSchema = z.object({
  phone: z.string().min(1, 'شماره موبایل را وارد کنید'),
});

const emailSchema = z.object({
  email: z.string().email('ایمیل صحیح وارد کنید'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type EmailFormData = z.infer<typeof emailSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const handleSendOtp = async (data: PhoneFormData | EmailFormData) => {
    setIsLoading(true);
    try {
      const username = 'phone' in data ? data.phone : data.email;
      await authService.userExistence({
        username,
        type: 'login',
        method,
      });
      toast.success('کد تایید ارسال شد');
      setStep('otp');
    } catch (err: any) {
      const message = err.response?.data?.message || 'خطا در ارسال کد';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 5) {
      toast.error('کد تایید باید 5 رقم باشد');
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.checkOtp(otpCode);
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        await useAuthStore.getState().checkLogin();
        toast.success('ورود موفقیت‌آمیز بود');
        router.push('/');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'کد تایید نادرست است';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>ورود به حساب کاربری</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {step === 'input'
            ? 'شماره موبایل یا ایمیل خود را وارد کنید'
            : 'کد تایید ارسال شده را وارد کنید'}
        </p>
      </div>

      {step === 'input' ? (
        <>
          {/* Method Tabs */}
          <div className="flex rounded-lg p-1 mb-6" style={{ background: 'var(--secondary)' }}>
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                method === 'phone' ? 'shadow-sm' : ''
              }`}
              style={method === 'phone' ? { background: 'var(--surface)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' }}
            >
              شماره موبایل
            </button>
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                method === 'email' ? 'shadow-sm' : ''
              }`}
              style={method === 'email' ? { background: 'var(--surface)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' }}
            >
              ایمیل
            </button>
          </div>

          {method === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <Input
                label="شماره موبایل"
                placeholder="09123456789"
                error={phoneForm.formState.errors.phone?.message}
                {...phoneForm.register('phone')}
              />
              <Button type="submit" isLoading={isLoading} className="w-full">
                ارسال کد تایید
              </Button>
            </form>
          ) : (
            <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <Input
                label="ایمیل"
                type="email"
                placeholder="example@email.com"
                error={emailForm.formState.errors.email?.message}
                {...emailForm.register('email')}
              />
              <Button type="submit" isLoading={isLoading} className="w-full">
                ارسال کد تایید
              </Button>
            </form>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <Input
            label="کد تایید"
            placeholder="12345"
            maxLength={5}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
          <Button onClick={handleVerifyOtp} isLoading={isLoading} className="w-full">
            تایید کد
          </Button>
          <button
            onClick={() => setStep('input')}
            className="w-full text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            تغییر شماره/ایمیل
          </button>
        </div>
      )}
    </div>
  );
}
