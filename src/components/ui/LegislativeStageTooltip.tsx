'use client';

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

// Stage icons for visual identification
const stageIcons: Record<string, string> = {
  introduced: '📄',
  referred: '📋',
  reported: '✅',
  passed: '🏛️',
  enrolled: '📜',
  enacted: '⚖️',
  vetoed: '❌',
  failed: '💀',
  markup: '✏️',
  hearing: '🎤',
  floorVote: '🗳️',
  cloture: '⏰',
  timeline_introduced: '📄',
  timeline_committee: '📋',
  timeline_committee_amendments: '✏️',
  timeline_vote: '🗳️',
  timeline_passed: '🏛️',
  timeline_signed: '✍️'
};

export const LegislativeStageTooltip = ({ 
  stage,
  children,
  position = 'top',
  className = '',
  showIcon = true,
  showProgress = false
}: LegislativeStageTooltipProps) => {
  const tooltipContent = getTooltipContent(stage);
  const icon = stageIcons[stage] || '📋';

  if (!tooltipContent) {
    return <>{children}</>;
  }
  
  const content = (
    <div className="legislative-stage-tooltip text-left text-slate-900 dark:text-slate-50 max-w-full">
      <div className="stage-header mb-2 flex items-center gap-2">
        {showIcon && (
          <span className="text-lg" aria-hidden>
            {icon}
          </span>
        )}
        <strong className="font-semibold text-sm text-inherit">
          {tooltipContent.title}
        </strong>
      </div>
      
      <div className="stage-content mb-2">
        <p className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300`}>
          {tooltipContent.content}
        </p>
      </div>
      
      {showProgress && (
        <div className="stage-progress pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            <span className="font-medium">Stage:</span> {stage.replace('timeline_', '').replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <Tooltip
      content={content}
      position={position}
      className={className}
      maxWidth="max-w-md"
    >
      {children}
    </Tooltip>
  );
};

// Specialized component for bill status tooltips
interface BillStatusTooltipProps {
  status: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showStage?: boolean;
}

export const BillStatusTooltip = ({ 
  status,
  children,
  position = 'top',
  className = '',
  showStage = true
}: BillStatusTooltipProps) => {
  const tooltipContent = getTooltipContent(status);
  const icon = stageIcons[status] || '📋';

  if (!tooltipContent) {
    return <>{children}</>;
  }
  
  const content = (
    <div className="bill-status-tooltip text-left text-slate-900 dark:text-slate-50 max-w-full">
      <div className="status-header mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden>{icon}</span>
        <strong className="font-semibold text-sm text-inherit">
          {tooltipContent.title}
        </strong>
      </div>
      
      <div className="status-content mb-2">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {tooltipContent.content}
        </p>
      </div>
      
      {showStage && (
        <div className="status-stage pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            <span className="font-medium">Current Status:</span> {status.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <Tooltip
      content={content}
      position={position}
      className={className}
      maxWidth="max-w-md"
    >
      {children}
    </Tooltip>
  );
};