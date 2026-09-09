'use client';

import { Suspense } from 'react';
import SearchContent from './SearchContent';
import Spinner from '@/components/ui/Spinner';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
