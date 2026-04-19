'use client';

import React from 'react';
import { BillsBrowse } from '@/components/bills/BillsBrowse';

export default function HouseBillsPage() {
  return (
    <BillsBrowse
      title="Kentucky House Bills"
      subtitle="House bills and resolutions (HB, HR, HJR, HCR, etc.) from the Kentucky General Assembly."
      chamberMode="house"
    />
  );
}
