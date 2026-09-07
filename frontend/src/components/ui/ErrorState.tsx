'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'خطایی رخ داد',
  message = 'مشکلی پیش آمده است. لطفا دوباره تلاش کنید.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4" style={{ color: 'var(--error)' }}>
        <AlertTriangle className="h-16 w-16" />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 ml-2" />
          تلاش مجدد
        </Button>
      )}
    </div>
  );
}
