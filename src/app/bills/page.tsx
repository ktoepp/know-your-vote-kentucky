'use client';

import React from 'react';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

export default function BillsPage() {
  return (
    <BillsBrowse
      title="Kentucky Bills"
      subtitle="Browse bills from the Kentucky General Assembly. Filter by chamber, status, or search by keyword."
      chamberMode="all"
    />
  );
}
