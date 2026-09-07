'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Home, Search, PenSquare, User } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const navItems = [
    { href: '/', icon: Home, label: 'خانه' },
    { href: '/search', icon: Search, label: 'جستجو' },
    ...(isAuthenticated
      ? [
          { href: '/blog/create', icon: PenSquare, label: 'نوشتن' },
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
              className="flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors"
              style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
