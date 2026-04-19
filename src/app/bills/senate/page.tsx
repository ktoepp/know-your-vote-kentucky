'use client';

import React from 'react';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

export default function SenateBillsPage() {
  return (
    <BillsBrowse
      title="Kentucky Senate Bills"
      subtitle="Senate bills and resolutions (SB, SR, SJR, SCR, etc.) from the Kentucky General Assembly."
      chamberMode="senate"
    />
  );
}
