'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

export default function BillsPage() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;

  return (
    <BillsBrowse
      title="Kentucky Bills"
      subtitle="Browse bills from the Kentucky General Assembly. Filter by chamber, status, or search by keyword."
      chamberMode="all"
      initialTopic={topic}
    />
  );
}
