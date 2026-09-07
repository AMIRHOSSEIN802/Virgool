'use client';

import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === tab.id
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent hover:text-[var(--text-primary)]'
          }`}
          style={{ color: activeTab === tab.id ? undefined : 'var(--text-tertiary)' }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
