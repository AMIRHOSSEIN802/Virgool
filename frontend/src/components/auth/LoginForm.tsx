'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';

type Method = 'phone' | 'email';
type Step = 'input' | 'otp';

/**
 * OTP-based login/register form.
 *
 * Flow (matches the backend contract):
 * 1. POST /auth/user-existence {username, type, method}
 *    - type='login'  → account must exist, else 401
 *    - type='register' → account must NOT exist, else 409
 *    Backend auto-detects login vs register in most deployments; we try login
 *    first and transparently fall back to register on 401 ("account not found").
 * 2. POST /auth/check-otp {code} → { accessToken }
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only allow same-origin relative paths — prevents `/auth?redirect=https://evil.com`
  // open redirects. `//host` is protocol-relative and must be rejected too.
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const [method, setMethod] = useState<Method>('phone');
  const [step, setStep] = useState<Step>('input');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(method === 'phone' ? 'شماره موبایل را وارد کنید' : 'ایمیل خود را وارد کنید');
      return;
    }
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('ایمیل صحیح وارد کنید');
      return;
    }
    if (method === 'phone' && !/^09\d{9}$/.test(trimmed)) {
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }

    setIsLoading(true);
    try {
      await authService.userExistence({
        username: trimmed,
        type: 'login',
        method,
      });
      toast.success('کد تایید ارسال شد');
      setUsername(trimmed);
      setStep('otp');
      setOtpCode('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      const message =
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      const msgText = Array.isArray(message) ? message[0] : message;

      // Account doesn't exist → fall back to registration automatically.
      if (status === 401) {
        try {
          await authService.userExistence({
            username: trimmed,
            type: 'register',
            method,
          });
          toast.success('حساب جدید ساخته شد و کد تایید ارسال شد');
          setUsername(trimmed);
          setStep('otp');
          setOtpCode('');
        } catch (regErr: unknown) {
          const regMsg =
            (regErr as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message;
          toast.error(Array.isArray(regMsg) ? regMsg[0] : regMsg || 'خطا در ثبت‌نام');
        }
      } else {
        toast.error(msgText || 'خطا در ارسال کد');
      }
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
        router.push(redirectTo);
      } else {
        toast.error('پاسخ نامعتبر از سرور');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'کد تایید نادرست است');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {step === 'input' ? 'ورود | ثبت‌نام' : 'تایید کد'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {step === 'input'
            ? 'برای ورود یا ساخت حساب جدید، شماره موبایل یا ایمیل خود را وارد کنید'
            : `کد 5 رقمی ارسال‌شده به ${method === 'phone' ? username : username} را وارد کنید`}
        </p>
      </div>

      {step === 'input' ? (
        <SendOtpStep method={method} onMethodChange={setMethod} onSubmit={handleSendOtp} isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          <Input
            label="کد تایید"
            placeholder="- - - - -"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={5}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            className="text-center tracking-[0.5em] text-lg"
          />
          <Button onClick={handleVerifyOtp} isLoading={isLoading} className="w-full">
            تایید و ورود
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setStep('input');
                setOtpCode('');
              }}
              className="flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowRight className="h-4 w-4" />
              تغییر شماره/ایمیل
            </button>
            <button
              onClick={() => handleSendOtp(username)}
              disabled={isLoading}
              className="hover:opacity-80"
              style={{ color: 'var(--link)' }}
            >
              ارسال مجدد کد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SendOtpStep({
  method,
  onMethodChange,
  onSubmit,
  isLoading,
}: {
  method: Method;
  onMethodChange: (m: Method) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-5">
      {/* Method Tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--secondary)' }}>
        {(
          [
            { id: 'phone', label: 'شماره موبایل' },
            { id: 'email', label: 'ایمیل' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onMethodChange(tab.id)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={
              method === tab.id
                ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--text-tertiary)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Input
        label={method === 'phone' ? 'شماره موبایل' : 'ایمیل'}
        placeholder={method === 'phone' ? '09123456789' : 'example@email.com'}
        type={method === 'phone' ? 'tel' : 'email'}
        inputMode={method === 'phone' ? 'numeric' : 'email'}
        dir={method === 'phone' ? 'ltr' : 'ltr'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSubmit(value))}
        className="text-left"
      />

      <Button onClick={() => onSubmit(value)} isLoading={isLoading} className="w-full">
        ادامه
      </Button>
    </div>
  );
}
