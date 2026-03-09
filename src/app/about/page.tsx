'use client';

import React from 'react';
import {
  Info,
  Timeline,
  Construction,
} from '@mui/icons-material';
import ComingSoonPage from '@/components/ui/ComingSoonPage';

export default function AboutPage() {
  return (
    <ComingSoonPage
      title="About Know Your Vote Kentucky"
      description="We're currently building out comprehensive information about Know Your Vote Kentucky, including our mission, methodology, and user guides. This section will provide detailed insights into how we track and analyze legislative activity."
      features={[
        { icon: <Info />, label: "Mission & Vision" },
        { icon: <Timeline />, label: "Methodology" },
        { icon: <Construction />, label: "User Guides" },
      ]}
    />
  );
} 