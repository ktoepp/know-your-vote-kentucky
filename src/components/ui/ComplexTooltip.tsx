'use client';

import { useState } from 'react';
import { Tooltip } from './Tooltip';

interface ComplexTooltipProps {
  title: string;
  summary: string;
  details: string[];
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const ComplexTooltip = ({ 
  title, 
  summary, 
  details, 
  children,
  position = 'top',
  className = ''
}: ComplexTooltipProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const content = (
    <div className="complex-tooltip">
      <div className="tooltip-header mb-2">
        <strong className="text-white font-semibold">{title}</strong>
      </div>
      <p className="tooltip-summary text-gray-200 mb-2">{summary}</p>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
        className="tooltip-toggle text-blue-300 hover:text-blue-200 text-xs underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        {showDetails ? 'Show Less' : 'Learn More'}
      </button>
      
      {showDetails && (
        <div className="tooltip-details mt-2 pt-2 border-t border-gray-600">
          {details.map((detail, index) => (
            <p key={index} className="detail-item text-gray-300 text-xs mb-1">
              • {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
  
  return (
    <Tooltip 
      content={content} 
      position={position}
      className={className}
      maxWidth="max-w-sm"
    >
      {children}
    </Tooltip>
  );
};

export default ComplexTooltip; 