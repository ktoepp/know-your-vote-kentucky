'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

function BillsPageInner() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;

  return (
    <BillsBrowse
      title="Explore Bills"
      subtitle="Browse bills from the current and recent sessions of the Kentucky General Assembly."
      chamberMode="all"
      initialTopic={topic}
    />
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={null}>
      <BillsPageInner />
    </Suspense>
  );
}
