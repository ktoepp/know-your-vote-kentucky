'use client';

import React from 'react';
import {
  Explore,
  BarChart,
  Map,
  AccountTree,
  Compare,
  Assessment,
} from '@mui/icons-material';
import ComingSoonPage from '@/components/ui/ComingSoonPage';

export default function ExplorePage() {
  return (
    <ComingSoonPage
      title="Data Exploration"
      description="We're building interactive data exploration tools that will help you discover patterns, trends, and insights in congressional activity. This will include visualizations, trend analysis, and comparative studies."
      features={[
        { icon: <Explore />, label: "Interactive Visualizations" },
        { icon: <BarChart />, label: "Trend Analysis" },
        { icon: <Map />, label: "Geographic Mapping" },
        { icon: <AccountTree />, label: "Network Analysis" },
        { icon: <Compare />, label: "Comparative Studies" },
        { icon: <Assessment />, label: "Custom Reports" },
      ]}
    />
  );
}