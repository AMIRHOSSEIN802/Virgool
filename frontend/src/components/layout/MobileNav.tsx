'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { toPersianDigits } from '@/lib/utils';
import { Home, Search, PenSquare, Bookmark, Bell, User } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { unread } = useUnreadCount();

  const navItems: { href: string; icon: typeof Home; label: string; badge?: number }[] = [
    { href: '/', icon: Home, label: 'خانه' },
    { href: '/search', icon: Search, label: 'جستجو' },
    ...(isAuthenticated
      ? [
          { href: '/blog/create', icon: PenSquare, label: 'نوشتن' },
          { href: '/saved', icon: Bookmark, label: 'ذخیره‌ها' },
          { href: '/notifications', icon: Bell, label: 'اعلان‌ها', badge: unread },
          { href: '/profile', icon: User, label: 'پروفایل' },
        ]
      : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors"
              style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }}
            >
              <item.icon className="h-5 w-5" />
              {!!item.badge && item.badge > 0 && (
                <span
                  className="absolute top-0 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--error)', color: '#fff' }}
                >
                  {item.badge > 9 ? '۹+' : toPersianDigits(item.badge)}
                </span>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
