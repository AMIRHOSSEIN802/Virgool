'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/components/layout/ThemeProvider';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import {
  Search, PenSquare, Menu, X, LogOut, User, Home, Shield, Sun, Moon, Monitor, FileText,
} from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Seed the search box from the URL when landing on /search (render-time
  // state adjustment — the React-recommended alternative to setState in effects).
  const [seededPath, setSeededPath] = useState(pathname);
  if (seededPath !== pathname) {
    setSeededPath(pathname);
    setSearchQuery(
      pathname === '/search'
        ? new URLSearchParams(window.location.search).get('q') || ''
        : ''
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setMobileMenuOpen(false);
    }
  };

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]);
  };

  const themeLabel = theme === 'system' ? 'سیستم (خودکار)' : theme === 'dark' ? 'حالت تاریک' : 'حالت روشن';

  const closeMobile = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    closeMobile();
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl transition-colors"
      style={{
        background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
              style={{ background: 'var(--primary)' }}
            >
              <span className="font-bold text-base" style={{ color: 'var(--primary-text)' }}>و</span>
            </div>
            <span className="text-xl font-extrabold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              ویرگول
            </span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md" role="search">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--muted)' }} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در مقالات..."
                aria-label="جستجو در مقالات"
                className="w-full pr-10 pl-4 py-2.5 rounded-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--secondary)', color: 'var(--text-primary)', border: '1px solid transparent' }}
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={cycleTheme}
              className="p-2.5 rounded-xl transition-colors hover:bg-[var(--secondary)]"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={`تم فعلی: ${themeLabel}`}
              title={themeLabel}
            >
              {theme === 'system' ? <Monitor className="h-5 w-5" /> : resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {isLoading ? (
              <div className="h-9 w-9 rounded-full skeleton" />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href="/blog/create"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                >
                  <PenSquare className="h-4 w-4" />
                  نوشتن
                </Link>
                <Dropdown
                  trigger={
                    <button
                      className="flex items-center p-1 rounded-full transition-transform hover:scale-105"
                      aria-label="منوی کاربری"
                    >
                      <Avatar
                        src={user.profile?.image_profile}
                        alt={user.profile?.nick_name || user.username}
                        size="sm"
                        fallback={user.profile?.nick_name || user.username}
                      />
                    </button>
                  }
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {user.profile?.nick_name || user.username}
                    </p>
                    <p className="text-xs mt-0.5" dir="ltr" style={{ color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      @{user.username}
                    </p>
                  </div>
                  <MenuLink href="/profile" icon={<User className="h-4 w-4" />}>پروفایل من</MenuLink>
                  <MenuLink href="/blog/my" icon={<FileText className="h-4 w-4" />}>مقالات من</MenuLink>
                  <MenuLink href="/profile/followers" icon={<User className="h-4 w-4" />}>دنبال‌کنندگان</MenuLink>
                  {user.role === 'admin' && (
                    <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />}>پنل مدیریت</MenuLink>
                  )}
                  <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--error)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    خروج از حساب
                  </button>
                </Dropdown>
              </>
            ) : (
              <Link
                href="/auth"
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
              >
                ورود | ثبت‌نام
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl"
            style={{ color: 'var(--text-secondary)' }}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <form onSubmit={handleSearch} className="mt-2 mb-3" role="search">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted)' }} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در مقالات..."
                  aria-label="جستجو در مقالات"
                  className="w-full pr-10 pl-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={{ background: 'var(--secondary)', color: 'var(--text-primary)', border: '1px solid transparent' }}
                />
              </div>
            </form>
            <div className="space-y-0.5">
              <button
                onClick={cycleTheme}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl w-full transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === 'system' ? <Monitor className="h-4 w-4" /> : resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {themeLabel}
              </button>
              <MobileMenuLink href="/" icon={<Home className="h-4 w-4" />} onClick={closeMobile}>صفحه اصلی</MobileMenuLink>
              <MobileMenuLink href="/search" icon={<Search className="h-4 w-4" />} onClick={closeMobile}>جستجو</MobileMenuLink>
              {isAuthenticated && user ? (
                <>
                  <MobileMenuLink href="/blog/create" icon={<PenSquare className="h-4 w-4" />} onClick={closeMobile}>نوشتن مقاله</MobileMenuLink>
                  <MobileMenuLink href="/profile" icon={<User className="h-4 w-4" />} onClick={closeMobile}>پروفایل من</MobileMenuLink>
                  <MobileMenuLink href="/blog/my" icon={<FileText className="h-4 w-4" />} onClick={closeMobile}>مقالات من</MobileMenuLink>
                  {user.role === 'admin' && (
                    <MobileMenuLink href="/admin" icon={<Shield className="h-4 w-4" />} onClick={closeMobile}>پنل مدیریت</MobileMenuLink>
                  )}
                  <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm rounded-xl"
                    style={{ color: 'var(--error)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    خروج از حساب
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={closeMobile}
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-semibold mt-2"
                  style={{ background: 'var(--primary)', color: 'var(--primary-text)' }}
                >
                  ورود | ثبت‌نام
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
      style={{ color: 'var(--text-secondary)' }}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileMenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors hover:bg-[var(--surface-hover)]"
      style={{ color: 'var(--text-secondary)' }}
    >
      {icon}
      {children}
    </Link>
  );
}
