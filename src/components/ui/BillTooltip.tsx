'use client';

import { Tooltip } from './Tooltip';
import { createBillTooltip, BillTooltipContent } from '@/lib/tooltipContent';

interface BillTooltipProps {
  billNumber: string;
  fullTitle: string;
  sponsor: string;
  chamber: 'house' | 'senate';
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showSponsor?: boolean;
  showChamber?: boolean;
}

export const BillTooltip = ({ 
  billNumber,
  fullTitle,
  sponsor,
  chamber,
  children,
  position = 'top',
  className = '',
  showSponsor = true,
  showChamber = true
}: BillTooltipProps) => {
  const billTooltip = createBillTooltip(billNumber, fullTitle, sponsor, chamber);
  
  const content = (
    <div className="bill-tooltip">
      <div className="bill-header mb-2">
        <strong className="text-white font-semibold text-sm">
          {billTooltip.title}
        </strong>
      </div>
      
      <div className="bill-content mb-2">
        <p className="text-gray-200 text-sm leading-relaxed">
          {billTooltip.content}
        </p>
      </div>
      
      {(showSponsor || showChamber) && (
        <div className="bill-details pt-2 border-t border-gray-600">
          {showSponsor && (
            <div className="text-xs text-gray-300 mb-1">
              <span className="font-medium">Sponsor:</span> {sponsor}
            </div>
          )}
          {showChamber && (
            <div className="text-xs text-gray-300">
              <span className="font-medium">Chamber:</span> {chamber === 'house' ? 'Kentucky House of Representatives' : 'Kentucky Senate'}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  return (
    <Tooltip 
      content={content} 
      position={position}
      className={className}
      maxWidth="max-w-lg"
    >
      {children}
    </Tooltip>
  );
};

// Simplified version for just bill numbers
interface BillNumberTooltipProps {
  billNumber: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const BillNumberTooltip = ({ 
  billNumber,
  children,
  position = 'top',
  className = ''
}: BillNumberTooltipProps) => {
  const normalizedNumber = billNumber
    .replace(/^(hb|house bill)\s*/i, 'HB ')
    .replace(/^(sb|senate bill)\s*/i, 'SB ')
    .replace(/^(hjr|house joint resolution)\s*/i, 'HJR ')
    .replace(/^(sjr|senate joint resolution)\s*/i, 'SJR ')
    .replace(/^(hcr|house concurrent resolution)\s*/i, 'HCR ')
    .replace(/^(scr|senate concurrent resolution)\s*/i, 'SCR ')
    .replace(/^(hr|house resolution)\s*/i, 'HR ')
    .replace(/^(sr|senate resolution)\s*/i, 'SR ');
  
  const content = (
    <div className="bill-number-tooltip">
      <div className="text-white font-semibold text-sm mb-1">
        Bill Number
      </div>
      <div className="text-gray-200 text-sm">
        {normalizedNumber}
      </div>
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