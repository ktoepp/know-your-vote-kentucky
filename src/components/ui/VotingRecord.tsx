'use client';

import React from 'react';
import { Tooltip } from './Tooltip';
import { voteExplanations } from '@/lib/tooltipContent';

interface Vote {
  position: 'yes' | 'no' | 'abstain' | 'not_voting' | 'present';
  date: string;
  billNumber?: string;
  billTitle?: string;
}

interface Member {
  id: string;
  name: string;
  party: string;
  state: string;
  district?: number;
}

interface VotingRecordProps {
  member: Member;
  vote: Vote;
  showBillInfo?: boolean;
  className?: string;
}

// Helper functions moved outside components for reuse
const getVoteColor = (position: string) => {
  switch (position) {
    case 'yes':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'no':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
    case 'abstain':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    case 'not_voting':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    case 'present':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  }
};

const getVoteIcon = (position: string) => {
  switch (position) {
    case 'yes':
      return '✓';
    case 'no':
      return '✗';
    case 'abstain':
      return '○';
    case 'not_voting':
      return '—';
    case 'present':
      return '●';
    default:
      return '?';
  }
};

export const VotingRecord = ({ member, vote, showBillInfo = false, className = '' }: VotingRecordProps) => {
  return (
    <div className={`vote-record ${className}`}>
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Member Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {member.name}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              member.party === 'D' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                : member.party === 'R'
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {member.party}-{member.state}
              {member.district && `-${member.district}`}
            </span>
          </div>
          
          {showBillInfo && vote.billTitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {vote.billNumber}: {vote.billTitle}
            </p>
          )}
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {new Date(vote.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Vote Indicator with Tooltip */}
        <Tooltip content={voteExplanations[vote.position] || "Vote position on this bill"}>
          <div className={`
            flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-help
            ${getVoteColor(vote.position)}
          `}>
            <span className="text-lg font-bold">
              {getVoteIcon(vote.position)}
            </span>
            <span className="ml-1 text-xs opacity-75">ⓘ</span>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

// Component for displaying vote statistics
export const VoteStatistics = ({ votes }: { votes: Vote[] }) => {
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.position] = (acc[vote.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalVotes = votes.length;

  return (
    <div className="vote-statistics bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Voting Record Summary
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(voteCounts).map(([position, count]) => (
          <Tooltip key={position} content={voteExplanations[position as keyof typeof voteExplanations] || "Vote type"}>
            <div className="text-center cursor-help">
              <div className={`
                w-12 h-12 rounded-full border-2 flex items-center justify-center mx-auto mb-2
                ${getVoteColor(position)}
              `}>
                <span className="text-lg font-bold">
                  {getVoteIcon(position)}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {position.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {count} ({Math.round((count / totalVotes) * 100)}%)
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        Total votes: {totalVotes}
      </div>
    </div>
  );
};

export default VotingRecord; 