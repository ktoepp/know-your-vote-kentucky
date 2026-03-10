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
  timeline_markup: '✏️',
  timeline_vote: '🗳️',
  timeline_passed: '🏛️',
  timeline_signed: '✍️'
};

// Stage colors for visual hierarchy
const stageColors: Record<string, string> = {
  introduced: 'text-blue-300',
  referred: 'text-blue-300',
  reported: 'text-green-300',
  passed: 'text-green-300',
  enrolled: 'text-yellow-300',
  enacted: 'text-green-400',
  vetoed: 'text-red-300',
  failed: 'text-red-300',
  markup: 'text-purple-300',
  hearing: 'text-blue-300',
  floorVote: 'text-orange-300',
  cloture: 'text-yellow-300',
  timeline_introduced: 'text-blue-300',
  timeline_committee: 'text-blue-300',
  timeline_markup: 'text-purple-300',
  timeline_vote: 'text-orange-300',
  timeline_passed: 'text-green-300',
  timeline_signed: 'text-green-400'
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
  const color = stageColors[stage] || 'text-gray-300';
  
  if (!tooltipContent) {
    return <>{children}</>;
  }
  
  const content = (
    <div className="legislative-stage-tooltip">
      <div className="stage-header mb-2 flex items-center gap-2">
        {showIcon && (
          <span className="text-lg">{icon}</span>
        )}
        <strong className="text-white font-semibold text-sm">
          {tooltipContent.title}
        </strong>
      </div>
      
      <div className="stage-content mb-2">
        <p className={`text-sm leading-relaxed ${color}`}>
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
  const color = stageColors[status] || 'text-gray-300';
  
  if (!tooltipContent) {
    return <>{children}</>;
  }
  
  const content = (
    <div className="bill-status-tooltip">
      <div className="status-header mb-2 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <strong className="text-white font-semibold text-sm">
          {tooltipContent.title}
        </strong>
      </div>
      
      <div className="status-content mb-2">
        <p className={`text-sm leading-relaxed ${color}`}>
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