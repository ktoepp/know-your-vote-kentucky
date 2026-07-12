'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  AccessTime,
  AccountBalance,
  Assignment,
  Cancel,
  Description,
  Draw,
  Edit,
  Gavel,
  HowToVote,
  MenuBook,
  Mic,
  RemoveCircleOutline,
  TaskAlt,
  type SvgIconComponent,
} from '@mui/icons-material';
import { Tooltip } from './Tooltip';
import { getTooltipContent } from '@/lib/tooltipContent';

interface LegislativeStageTooltipProps {
  stage: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showIcon?: boolean;
  showProgress?: boolean;
}

const stageIcons: Record<string, SvgIconComponent> = {
  introduced: Description,
  referred: Assignment,
  reported: TaskAlt,
  passed: AccountBalance,
  enrolled: MenuBook,
  enacted: Gavel,
  vetoed: Cancel,
  failed: RemoveCircleOutline,
  markup: Edit,
  hearing: Mic,
  floorVote: HowToVote,
  cloture: AccessTime,
  timeline_introduced: Description,
  timeline_committee: Assignment,
  timeline_committee_amendments: Edit,
  timeline_vote: HowToVote,
  timeline_passed: AccountBalance,
  timeline_signed: Draw,
};

export const LegislativeStageTooltip = ({
  stage,
  children,
  position = 'top',
  className = '',
  showIcon = true,
  showProgress = false,
}: LegislativeStageTooltipProps) => {
  const tooltipContent = getTooltipContent(stage);
  const IconComponent = stageIcons[stage] || Assignment;

  if (!tooltipContent) {
    return <>{children}</>;
  }

  const content = (
    <Box sx={{ color: 'text.primary', textAlign: 'left', maxWidth: '100%' }}>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        {showIcon && (
          <IconComponent
            aria-hidden
            sx={{ fontSize: '1.125rem', color: 'primary.main' }}
          />
        )}
        <Typography component="strong" variant="body2" sx={{ fontWeight: 600 }}>
          {tooltipContent.title}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
        {tooltipContent.content}
      </Typography>

      {showProgress && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <Box component="span" sx={{ fontWeight: 600 }}>Stage:</Box>{' '}
            {stage.replace('timeline_', '').replace(/_/g, ' ')}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Tooltip content={content} position={position} className={className} maxWidth="max-w-md">
      {children}
    </Tooltip>
  );
};
