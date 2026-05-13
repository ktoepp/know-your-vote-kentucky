'use client';

import React, { Suspense } from 'react';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

function HouseBillsInner() {
  return (
    <BillsBrowse
      title="Kentucky House Bills"
      subtitle="House bills and resolutions (HB, HR, HJR, HCR, etc.) from the Kentucky General Assembly."
      chamberMode="house"
    />
  );
}

export default function HouseBillsPage() {
  return (
    <Suspense fallback={null}>
      <HouseBillsInner />
    </Suspense>
  );
}
