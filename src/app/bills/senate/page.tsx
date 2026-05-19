'use client';

import React, { Suspense } from 'react';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

function SenateBillsInner() {
  return (
    <BillsBrowse
      title="Senate Bills"
      subtitle="Senate bills and resolutions (SB, SR, SJR, SCR, etc.) from the Kentucky General Assembly."
      chamberMode="senate"
    />
  );
}

export default function SenateBillsPage() {
  return (
    <Suspense fallback={null}>
      <SenateBillsInner />
    </Suspense>
  );
}
