'use client';

import React from 'react';
import {
  Dashboard,
  Settings,
  Bookmark,
  Notifications,
  Timeline,
  Analytics,
} from '@mui/icons-material';
import ComingSoonPage from '@/components/ui/ComingSoonPage';

export default function DashboardPage() {
  return (
    <ComingSoonPage
      title="Personal Dashboard"
      description="We're building a personalized dashboard where you can track your congressional activity, save searches, set up alerts, and manage your preferences. This will help you stay informed about the issues that matter most to you."
      features={[
        { icon: <Dashboard />, label: "Activity Overview" },
        { icon: <Bookmark />, label: "Saved Searches" },
        { icon: <Notifications />, label: "Custom Alerts" },
        { icon: <Settings />, label: "Preferences" },
        { icon: <Timeline />, label: "Activity History" },
        { icon: <Analytics />, label: "Engagement Stats" },
      ]}
    />
  );
} 