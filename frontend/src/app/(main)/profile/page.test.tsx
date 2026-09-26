import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from './page';
import type { ProfileWithCounts } from '@/types/auth.types';

const {
  getProfileMock,
  changeEmailMock,
  changePhoneMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getProfileMock: vi.fn(),
  changeEmailMock: vi.fn(),
  changePhoneMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/services/user.service', () => ({
  userService: {
    getProfile: getProfileMock,
    changeEmail: changeEmailMock,
    changePhone: changePhoneMock,
  },
}));

// The OTP flow lives in the page itself — keep the child components as stubs
// so the test exercises exactly the branch that picks `otpRequired`.
vi.mock('@/components/auth/AuthGuard', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/profile/ProfileHeader', () => ({
  default: () => <div data-testid="profile-header" />,
}));
vi.mock('@/components/profile/ProfileForm', () => ({
  default: () => <div data-testid="profile-form" />,
}));
vi.mock('@/components/profile/DangerZone', () => ({
  default: () => <div data-testid="danger-zone" />,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: toastErrorMock },
}));

const PROFILE: ProfileWithCounts = {
  id: 1,
  username: 'tester',
  phone: null,
  email: 'old@test.dev',
  role: 'user',
  status: 'active',
  verify_email: true,
  verify_phone: false,
  profileId: 1,
  profile: {
    id: 1,
    nick_name: 'تست',
    bio: null,
    image_profile: null,
    bg_image: null,
    gender: null,
    birthday: null,
    linkedin_profile: null,
    x_profile: null,
    userId: 1,
  },
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  followersCount: 0,
  followingCount: 0,
};

const OTP_MODAL_TEXT = 'کد 5 رقمی ارسال‌شده را وارد کنید';

const renderProfile = async () => {
  render(<ProfilePage />);
  await screen.findByText('تنظیمات حساب');
};

const openEmailModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: /ایمیل/ }));
  await screen.findByPlaceholderText('example@email.com');
  fireEvent.change(screen.getByPlaceholderText('example@email.com'), {
    target: { value: 'new@test.dev' },
  });
  fireEvent.click(screen.getByText('ثبت و ارسال کد'));
};

const openPhoneModal = async () => {
  fireEvent.click(screen.getByRole('button', { name: /شماره موبایل/ }));
  await screen.findByPlaceholderText('09123456789');
  fireEvent.change(screen.getByPlaceholderText('09123456789'), {
    target: { value: '09123456788' },
  });
  fireEvent.click(screen.getByText('ثبت و ارسال کد'));
};

beforeEach(() => {
  vi.clearAllMocks();
  getProfileMock.mockResolvedValue(PROFILE);
});

describe('profile change flows (otpRequired contract)', () => {
  it('opens the OTP modal when the backend answers otpRequired: true', async () => {
    changeEmailMock.mockResolvedValue({
      message: 'کد با موفقیت ارسال شد',
      otpRequired: true,
    });

    await renderProfile();
    await openEmailModal();

    await screen.findByText(OTP_MODAL_TEXT);
    expect(changeEmailMock).toHaveBeenCalledWith('new@test.dev');
    expect(toastSuccessMock).toHaveBeenCalledWith('کد تایید ارسال شد');
    // the email form modal is closed once verification starts
    expect(screen.queryByPlaceholderText('example@email.com')).toBeNull();
  });

  it('completes without an OTP modal when otpRequired: false', async () => {
    changeEmailMock.mockResolvedValue({
      message: 'با موفقیت بروز رسانی شد',
      otpRequired: false,
    });

    await renderProfile();
    await openEmailModal();

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        'با موفقیت بروز رسانی شد',
      ),
    );
    expect(screen.queryByText(OTP_MODAL_TEXT)).toBeNull();
    expect(screen.queryByPlaceholderText('- - - - -')).toBeNull();
  });

  it('ignores a legacy `code`-only response (the contract is otpRequired)', async () => {
    changeEmailMock.mockResolvedValue({ message: '', code: '12345' });

    await renderProfile();
    await openEmailModal();

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('ایمیل بروزرسانی شد'),
    );
    expect(screen.queryByText(OTP_MODAL_TEXT)).toBeNull();
    expect(screen.queryByPlaceholderText('- - - - -')).toBeNull();
  });

  it('opens the OTP modal for change-phone on otpRequired: true', async () => {
    changePhoneMock.mockResolvedValue({
      message: 'کد با موفقیت ارسال شد',
      otpRequired: true,
    });

    await renderProfile();
    await openPhoneModal();

    await screen.findByText(OTP_MODAL_TEXT);
    expect(changePhoneMock).toHaveBeenCalledWith('09123456788');
    expect(toastSuccessMock).toHaveBeenCalledWith('کد تایید ارسال شد');
  });
});
