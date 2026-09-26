import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DangerZone from './DangerZone';

const { deleteAccountMock, logoutMock, pushMock, toastSuccessMock, toastErrorMock } =
  vi.hoisted(() => ({
    deleteAccountMock: vi.fn(),
    logoutMock: vi.fn(),
    pushMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }));

vi.mock('@/services/user.service', () => ({
  userService: { deleteAccount: deleteAccountMock },
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { logout: () => void }) => unknown) =>
    selector({ logout: logoutMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: toastSuccessMock, error: toastErrorMock },
}));

const USERNAME = 'amir';

const renderAndOpenModal = () => {
  render(<DangerZone username={USERNAME} />);
  fireEvent.click(screen.getByTestId('open-delete-modal'));
};

const typeUsername = (value: string) =>
  fireEvent.change(screen.getByTestId('confirm-username-input'), {
    target: { value },
  });

const confirmButton = () =>
  screen.getByTestId('confirm-delete-button') as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DangerZone (account deletion)', () => {
  it('keeps the delete button disabled until the username is typed exactly', () => {
    renderAndOpenModal();
    expect(confirmButton().disabled).toBe(true);

    typeUsername('someone-else');
    expect(confirmButton().disabled).toBe(true);

    typeUsername(USERNAME);
    expect(confirmButton().disabled).toBe(false);
  });

  it('does not call the API when the confirmation does not match', () => {
    renderAndOpenModal();
    typeUsername('not-my-name');

    // The button stays disabled, so no request can be fired.
    expect(confirmButton().disabled).toBe(true);
    expect(deleteAccountMock).not.toHaveBeenCalled();
  });

  it('deletes the account, shows the backend message, logs out and redirects', async () => {
    deleteAccountMock.mockResolvedValue({ message: 'حساب کاربری حذف شد' });

    renderAndOpenModal();
    typeUsername(USERNAME);
    fireEvent.click(confirmButton());

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(deleteAccountMock).toHaveBeenCalledWith(USERNAME);
    expect(toastSuccessMock).toHaveBeenCalledWith('حساب کاربری حذف شد');
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('surfaces the backend error and keeps the session on failure', async () => {
    deleteAccountMock.mockRejectedValue({
      response: { data: { message: 'پیام خطای سرور' } },
    });

    renderAndOpenModal();
    typeUsername(USERNAME);
    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('پیام خطای سرور')
    );
    expect(logoutMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    // The form must recover so the user can retry.
    await waitFor(() => expect(confirmButton().disabled).toBe(false));
  });

  it('falls back to a generic message when the backend sends none', async () => {
    deleteAccountMock.mockRejectedValue({});

    renderAndOpenModal();
    typeUsername(USERNAME);
    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('خطا در حذف حساب کاربری')
    );
    expect(logoutMock).not.toHaveBeenCalled();
  });
});
