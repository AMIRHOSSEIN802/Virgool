'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/components/layout/ThemeProvider';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import { Search, PenSquare, Menu, X, LogOut, User, Home, Shield, Sun, Moon, Monitor } from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]);
  };

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl transition-colors"
      style={{ background: 'color-mix(in srgb, var(--surface) 85%, transparent)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'var(--primary)' }}
            >
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              ویرگول
            </span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو..."
                className="w-full pr-10 pl-4 py-2.5 rounded-full text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ background: 'var(--secondary)', color: 'var(--text-primary)', border: 'none' }}
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              className="p-2.5 rounded-xl transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title={theme === 'system' ? 'سیستم (خودکار)' : theme === 'dark' ? 'تاریک' : 'روشن'}
            >
              {theme === 'system' ? <Monitor className="h-5 w-5" /> : <ThemeIcon className="h-5 w-5" />}
            </button>

            {isLoading ? (
              <div className="h-9 w-9 rounded-full animate-pulse" style={{ background: 'var(--skeleton)' }} />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href="/blog/create"
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  <PenSquare className="h-4 w-4" />
                  نوشتن
                </Link>
                <Dropdown
                  trigger={
                    <button className="flex items-center gap-2 p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      <Avatar
                        src={user.profile?.image_profile}
                        alt={user.profile?.nick_name || user.username}
                        size="sm"
                      />
                    </button>
                  }
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.profile?.nick_name || user.username}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <User className="h-4 w-4" />
                    پروفایل من
                  </Link>
                  <Link
                    href="/blog/my"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PenSquare className="h-4 w-4" />
                    مقالات من
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Shield className="h-4 w-4" />
                      پنل مدیریت
                    </Link>
                  )}
                  <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => {
                      logout();
                      router.push('/');
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm"
                    style={{ color: 'var(--error)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    خروج
                  </button>
                </Dropdown>
              </>
            ) : (
              <Link
                href="/auth"
                className="px-5 py-2 rounded-full text-sm font-medium transition-all text-white"
                style={{ background: 'var(--primary)' }}
              >
                ورود / ثبت‌نام
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 mt-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={{ background: 'var(--secondary)', color: 'var(--text-primary)', border: 'none' }}
                />
              </div>
            </form>
            <div className="space-y-1">
              {/* Mobile Theme Toggle */}
              <button
                onClick={cycleTheme}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl w-full transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === 'system' ? <Monitor className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === 'system' ? 'خودکار (سیستم)' : theme === 'dark' ? 'حالت تاریک' : 'حالت روشن'}
              </button>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Home className="h-4 w-4" />
                صفحه اصلی
              </Link>
              {isAuthenticated && user ? (
                <>
                  <Link
                    href="/blog/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PenSquare className="h-4 w-4" />
                    نوشتن مقاله
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <User className="h-4 w-4" />
                    پروفایل من
                  </Link>
                  <Link
                    href="/blog/my"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PenSquare className="h-4 w-4" />
                    مقالات من
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Shield className="h-4 w-4" />
                      پنل مدیریت
                    </Link>
                  )}
                  <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => {
                      logout();
                      router.push('/');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm rounded-xl"
                    style={{ color: 'var(--error)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    خروج
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  ورود / ثبت‌نام
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
