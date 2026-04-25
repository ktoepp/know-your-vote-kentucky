'use client';

import React from 'react';
import { Tooltip } from './Tooltip';
import { BillTooltip, BillNumberTooltip } from './BillTooltip';
import { LegislativeStageTooltip, BillStatusTooltip } from './LegislativeStageTooltip';
import { governmentTooltips } from '@/lib/tooltipContent';

// Example component showing practical tooltip usage
export const TooltipExamples = () => {
  // Sample Kentucky bill data
  const sampleBills = [
    {
      number: 'HB 1',
      title: 'An Act relating to the establishment of a state education savings program',
      sponsor: 'Rep. John Smith (R-Louisville)',
      chamber: 'house' as const,
      status: 'reported'
    },
    {
      number: 'SB 42',
      title: 'An Act relating to transportation infrastructure funding for rural counties',
      sponsor: 'Sen. Jane Doe (D-Lexington)',
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
            </LegislativeStageTooltip> by a member of the Kentucky General Assembly.
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
            </LegislativeStageTooltip> and may amend the bill before voting to advance it.
          </p>

          <p>
            If approved, the bill is <LegislativeStageTooltip stage="reported">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                reported favorably
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
            The Kentucky General Assembly uses a <Tooltip content={governmentTooltips.rollCall.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                roll call vote
              </span>
            </Tooltip> to record each member&apos;s individual position.
          </p>

          <p>
            If the Governor rejects a bill, it has been <Tooltip content={governmentTooltips.vetoed.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                vetoed
              </span>
            </Tooltip>. The legislature can attempt a <Tooltip content={governmentTooltips.veto_override.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                veto override
              </span>
            </Tooltip>, which requires 3/5 of elected members in each chamber.
          </p>

          <p>
            Bills that include an <Tooltip content={governmentTooltips.emergency_clause.content}>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                emergency clause
              </span>
            </Tooltip> take effect immediately upon the Governor&apos;s signature.
          </p>
        </div>
      </div>

      {/* Bill Number Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Kentucky Bill Number Examples</h3>

        <div className="space-y-2">
          <p>
            <BillNumberTooltip billNumber="HB 1">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                HB 1
              </span>
            </BillNumberTooltip> — House Bill: proposed law originating in the House
          </p>

          <p>
            <BillNumberTooltip billNumber="SB 42">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                SB 42
              </span>
            </BillNumberTooltip> — Senate Bill: proposed law originating in the Senate
          </p>

          <p>
            <BillNumberTooltip billNumber="HJR 5">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                HJR 5
              </span>
            </BillNumberTooltip> — House Joint Resolution: requires both chambers to approve
          </p>

          <p>
            <BillNumberTooltip billNumber="HCR 12">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                HCR 12
              </span>
            </BillNumberTooltip> — House Concurrent Resolution: does not become law
          </p>
        </div>
      </div>
    </div>
  );
}; 