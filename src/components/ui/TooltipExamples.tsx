'use client';

import React from 'react';
import { Tooltip } from './Tooltip';
import { BillTooltip, BillNumberTooltip } from './BillTooltip';
import { LegislativeStageTooltip, BillStatusTooltip } from './LegislativeStageTooltip';
import { governmentTooltips } from '@/lib/tooltipContent';

// Example component showing practical tooltip usage
export const TooltipExamples = () => {
  // Sample bill data
  const sampleBills = [
    {
      number: 'H.R. 1234',
      title: 'A bill to improve renewable energy infrastructure and create jobs in the clean energy sector',
      sponsor: 'Rep. Jane Smith (D-CA)',
      chamber: 'house' as const,
      status: 'reported'
    },
    {
      number: 'S. 5678',
      title: 'A bill to expand healthcare coverage and reduce prescription drug costs',
      sponsor: 'Sen. John Doe (D-NY)',
      chamber: 'senate' as const,
      status: 'passed'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Bill Card Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Bill Card Example</h3>
        
        {sampleBills.map((bill, index) => (
          <div key={index} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-start justify-between mb-2">
              <BillTooltip
                billNumber={bill.number}
                fullTitle={bill.title}
                sponsor={bill.sponsor}
                chamber={bill.chamber}
              >
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {bill.number}
                </span>
              </BillTooltip>
              
              <BillStatusTooltip status={bill.status}>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium">
                  {bill.status === 'reported' && '📋 Reported'}
                  {bill.status === 'passed' && '🏛️ Passed'}
                </span>
              </BillStatusTooltip>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {bill.title}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Sponsor: {bill.sponsor}</span>
              <span>Chamber: {bill.chamber === 'house' ? 'House' : 'Senate'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legislative Process Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Legislative Process Example</h3>
        
        <div className="space-y-2">
          <p>
            A bill is first <LegislativeStageTooltip stage="introduced">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                introduced
              </span>
            </LegislativeStageTooltip> by a member of Congress.
          </p>
          
          <p>
            It&apos;s then <LegislativeStageTooltip stage="referred">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                referred
              </span>
            </LegislativeStageTooltip> to a <Tooltip content={governmentTooltips.committee.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                committee
              </span>
            </Tooltip> for review.
          </p>
          
          <p>
            The committee holds <LegislativeStageTooltip stage="hearing">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                hearings
              </span>
            </LegislativeStageTooltip> and conducts a <LegislativeStageTooltip stage="markup">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                markup session
              </span>
            </LegislativeStageTooltip>.
          </p>
          
          <p>
            If approved, the bill is <LegislativeStageTooltip stage="reported">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                reported
              </span>
            </LegislativeStageTooltip> to the full chamber for a <LegislativeStageTooltip stage="floorVote">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                floor vote
              </span>
            </LegislativeStageTooltip>.
          </p>
        </div>
      </div>

      {/* Voting Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Voting Example</h3>
        
        <div className="space-y-2">
          <p>
            The Senate uses a <Tooltip content={governmentTooltips.rollCall.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                roll call vote
              </span>
            </Tooltip> to record each member&apos;s position.
          </p>
          
          <p>
            If there&apos;s a <Tooltip content={governmentTooltips.filibuster.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                filibuster
              </span>
            </Tooltip>, the Senate may need a <Tooltip content={governmentTooltips.cloture.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                cloture vote
              </span>
            </Tooltip> to end debate.
          </p>
          
          <p>
            For budget bills, they might use <Tooltip content={governmentTooltips.reconciliation.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                reconciliation
              </span>
            </Tooltip> to bypass the filibuster.
          </p>
        </div>
      </div>

      {/* Bill Number Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Bill Number Examples</h3>
        
        <div className="space-y-2">
          <p>
            <BillNumberTooltip billNumber="H.R. 1234">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                H.R. 1234
              </span>
            </BillNumberTooltip> - House bill
          </p>
          
          <p>
            <BillNumberTooltip billNumber="S. 5678">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                S. 5678
              </span>
            </BillNumberTooltip> - Senate bill
          </p>
          
          <p>
            <BillNumberTooltip billNumber="H.J.Res. 42">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                H.J.Res. 42
              </span>
            </BillNumberTooltip> - House joint resolution
          </p>
          
          <p>
            <BillNumberTooltip billNumber="S.Con.Res. 15">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                S.Con.Res. 15
              </span>
            </BillNumberTooltip> - Senate concurrent resolution
          </p>
        </div>
      </div>
    </div>
  );
}; 