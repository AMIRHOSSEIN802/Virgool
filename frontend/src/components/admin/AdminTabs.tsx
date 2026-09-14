'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderTree, MessageCircle, Users } from 'lucide-react';

/** Sub-navigation shared by the admin pages (admin-only routes). */
export default function AdminTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/users', label: 'کاربران', icon: Users },
    { href: '/admin/categories', label: 'دسته‌ها', icon: FolderTree },
    { href: '/admin/comments', label: 'نظرها', icon: MessageCircle },
  ];
  return (
    <div className="flex gap-1 rounded-xl p-1 w-fit mb-6" style={{ background: 'var(--secondary)' }} role="tablist" aria-label="بخش‌های مدیریت">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all"
            style={
              active
                ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { color: 'var(--text-tertiary)' }
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
