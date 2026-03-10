'use client';

import React from 'react';
import { Tooltip } from './Tooltip';
import { governmentTooltips } from '@/lib/tooltipContent';

interface TimelineStep {
  id: string;
  label: string;
  tooltip: {
    title: string;
    content: string;
  };
  status: 'completed' | 'current' | 'pending';
  date?: string;
}

interface LegislativeTimelineProps {
  bill: {
    actions?: Array<{
      actionDate: string;
      text: string;
    }>;
    introduced_date?: string;
    last_action?: string;
  };
  className?: string;
}

export const LegislativeTimeline = ({ bill, className = '' }: LegislativeTimelineProps) => {
  const getCurrentStatus = (stepId: string): 'completed' | 'current' | 'pending' => {
    if (!bill.actions || bill.actions.length === 0) {
      return stepId === 'introduced' ? 'completed' : 'pending';
    }

    const lastAction = bill.actions[0].text.toLowerCase();
    
    switch (stepId) {
      case 'introduced':
        return 'completed';
      case 'committee':
        if (lastAction.includes('reported') || lastAction.includes('passed') || lastAction.includes('enrolled')) {
          return 'completed';
        } else if (lastAction.includes('referred') || lastAction.includes('hearing') || lastAction.includes('markup')) {
          return 'current';
        }
        return 'pending';
      case 'floor':
        if (lastAction.includes('enrolled')) {
          return 'completed';
        } else if (lastAction.includes('passed')) {
          return 'completed';
        }
        return 'pending';
      case 'enacted':
        if (lastAction.includes('enrolled')) {
          return 'current';
        }
        return 'pending';
      default:
        return 'pending';
    }
  };

  const steps: TimelineStep[] = [
    {
      id: 'introduced',
      label: 'Introduced',
      tooltip: governmentTooltips.introduced,
      status: getCurrentStatus('introduced'),
      date: bill.introduced_date
    },
    {
      id: 'committee',
      label: 'Committee Review',
      tooltip: {
        title: "Committee Review",
        content: "Committee members study the bill, hold hearings with experts, make changes, and vote on whether to advance it to the full chamber."
      },
      status: getCurrentStatus('committee')
    },
    {
      id: 'floor',
      label: 'Floor Vote',
      tooltip: governmentTooltips.floorVote,
      status: getCurrentStatus('floor')
    },
    {
      id: 'enacted',
      label: 'Becomes Law',
      tooltip: {
        title: "Becomes Law",
        content: "After passing both chambers, the bill goes to the President. If signed (or if Congress overrides a veto), it becomes law."
      },
      status: getCurrentStatus('enacted')
    }
  ];

  return (
    <div className={`timeline-container ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Legislative Process
        </h3>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
        
        {steps.map((step, index) => (
          <Tooltip 
            key={step.id} 
            content={step.tooltip.content} 
            maxWidth="max-w-sm"
            position="right"
          >
            <div className={`timeline-step relative flex items-center mb-6 cursor-help ${step.status}`}>
              {/* Timeline indicator */}
              <div className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center z-10
                ${step.status === 'completed' 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : step.status === 'current'
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }
              `}>
                {step.status === 'completed' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {step.status === 'current' && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
                {step.status === 'pending' && (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* Step content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center">
                  <h4 className={`
                    font-medium text-sm
                    ${step.status === 'completed' 
                      ? 'text-green-700 dark:text-green-400' 
                      : step.status === 'current'
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {step.label}
                    <span className="ml-1 text-xs opacity-75">ⓘ</span>
                  </h4>
                </div>
                
                {step.date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(step.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default LegislativeTimeline; 