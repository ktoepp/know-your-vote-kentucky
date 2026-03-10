'use client';

import React from 'react';
import {
  BrowseGallery,
  Category,
  Topic,
  History,
  PhotoLibrary,
  LibraryBooks,
} from '@mui/icons-material';
import ComingSoonPage from '@/components/ui/ComingSoonPage';

export default function BrowsePage() {
  return (
    <ComingSoonPage
      title="Content Browser"
      description="We're building a comprehensive content browser that will help you explore congressional data by topics, committees, issue areas, and historical periods. This will make it easy to discover relevant political content."
      features={[
        { icon: <BrowseGallery />, label: "Topic-Based Browsing" },
        { icon: <Category />, label: "Committee Content" },
        { icon: <Topic />, label: "Issue Area Exploration" },
        { icon: <History />, label: "Historical Data" },
        { icon: <PhotoLibrary />, label: "Media Gallery" },
        { icon: <LibraryBooks />, label: "Document Library" },
      ]}
    />
  );
} 