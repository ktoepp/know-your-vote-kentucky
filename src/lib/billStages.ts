// Canonical bill stages for Know Your Vote Kentucky
export type BillStage = {
  key: string;
  label: string;
  description: string;
  group: string; // e.g., 'Introduction', 'Committee', etc.
};

export const BILL_STAGES: BillStage[] = [
  // 1. Introduction & Referral
  { key: 'introduced', label: 'Introduced', group: 'Introduction & Referral', description: 'Bill first introduced in House or Senate.' },
  { key: 'referred_committee', label: 'Referred to Committee', group: 'Introduction & Referral', description: 'Assigned to appropriate committee(s).' },
  { key: 'referred_subcommittee', label: 'Referred to Subcommittee', group: 'Introduction & Referral', description: 'Committee assigns to specialized subcommittee.' },
  // 2. Committee Process
  { key: 'in_committee', label: 'In Committee', group: 'Committee Process', description: 'Under committee review (can be months).' },
  { key: 'hearing_scheduled', label: 'Hearing Scheduled', group: 'Committee Process', description: 'Public hearing announced.' },
  { key: 'hearing_held', label: 'Hearing Held', group: 'Committee Process', description: 'Committee conducted public hearing.' },
  { key: 'markup_scheduled', label: 'Markup Scheduled', group: 'Committee Process', description: 'Committee to consider amendments.' },
  { key: 'markup_session', label: 'Markup Session', group: 'Committee Process', description: 'Committee actively amending/voting.' },
  { key: 'reported_committee', label: 'Reported by Committee', group: 'Committee Process', description: 'Committee approved, sent to floor.' },
  { key: 'committee_killed', label: 'Committee Killed Bill', group: 'Committee Process', description: 'Committee voted against or tabled.' },
  // 3. Floor Action
  { key: 'placed_calendar', label: 'Placed on Calendar', group: 'Floor Action', description: 'Scheduled for floor consideration.' },
  { key: 'rules_committee', label: 'Rules Committee', group: 'Floor Action', description: '(House only) Setting debate rules.' },
  { key: 'floor_debate', label: 'Floor Debate', group: 'Floor Action', description: 'Active debate happening.' },
  { key: 'amendment_process', label: 'Amendment Process', group: 'Floor Action', description: 'Floor amendments being offered.' },
  { key: 'final_passage_vote', label: 'Final Passage Vote', group: 'Floor Action', description: 'Chamber voting on final passage.' },
  // 4. Bicameral Process
  { key: 'passed_chamber', label: 'Passed [Chamber]', group: 'Bicameral Process', description: 'Completed one chamber, sent to other.' },
  { key: 'different_versions', label: 'Different Versions', group: 'Bicameral Process', description: 'Both chambers passed different versions.' },
  { key: 'conference_committee', label: 'Conference Committee', group: 'Bicameral Process', description: 'Joint committee resolving differences.' },
  { key: 'conference_report', label: 'Conference Report', group: 'Bicameral Process', description: 'Committee reached compromise.' },
  { key: 'final_congressional_approval', label: 'Final Congressional Approval', group: 'Bicameral Process', description: 'Both chambers approved identical version.' },
  // 5. Governor's Action
  { key: 'sent_president', label: 'Sent to Governor', group: "Governor's Action", description: "Awaiting the Governor's action." },
  { key: 'signed_law', label: 'Signed into Law', group: "Governor's Action", description: 'Governor signed the bill.' },
  { key: 'presidential_veto', label: 'Vetoed by Governor', group: "Governor's Action", description: 'Governor rejected the bill; legislature may attempt override.' },
  { key: 'veto_override', label: 'Veto Override Attempt', group: "Governor's Action", description: 'General Assembly attempting 3/5 override in each chamber.' },
  { key: 'pocket_veto', label: 'Became Law Without Signature', group: "Governor's Action", description: 'Governor did not sign or veto within the required window; bill became law.' },
  // 6. Critical Status Indicators
  { key: 'urgent', label: 'Urgent/Fast-Track', group: 'Critical Status', description: 'Leadership prioritizing quick passage.' },
  { key: 'bipartisan', label: 'Bipartisan Support', group: 'Critical Status', description: 'Strong support from both parties.' },
  { key: 'controversial', label: 'Controversial', group: 'Critical Status', description: 'Significant opposition or debate.' },
  { key: 'deadline', label: 'Deadline Approaching', group: 'Critical Status', description: 'Must-pass bills with time constraints.' },
  { key: 'stalled', label: 'Stalled', group: 'Critical Status', description: 'No action for extended period.' },
];

// Map legislative action text/codes to canonical stages
// This is a stub; to be implemented with real mappings
export function mapCongressGovActionToStage(actionText: string): BillStage | undefined {
  // TODO: Implement robust mapping logic
  const lower = actionText.toLowerCase();
  if (lower.includes('introduced')) return BILL_STAGES.find(s => s.key === 'introduced');
  if (lower.includes('committee')) return BILL_STAGES.find(s => s.key === 'in_committee');
  // ... more mappings ...
  return undefined;
}

// Utility: Get simplified legislative stages for an event (for landing page)
export function getLegislativeStagesForEvent(event: any) {
  // 1. Detect bill type
  let billType = event.billType || event.type || '';
  const title = (event.title || '').toLowerCase();
  if (!billType && title.includes('resolution')) billType = 'RESOLUTION';
  if (!billType && title.includes('amendment')) billType = 'AMENDMENT';
  if (!billType && title.includes('appropriation')) billType = 'APPROPRIATION';
  if (!billType && title.includes('authorization')) billType = 'AUTHORIZATION';
  if (!billType) billType = 'BILL';

  // 2. Choose canonical stage sequence (simplified for landing page)
  let stages: { key: string; label: string }[] = [];
  if (billType.includes('RESOLUTION')) {
    stages = [
      { key: 'introduced', label: 'Introduced' },
      { key: 'committee', label: 'Committee' },
      { key: 'vote', label: 'Vote' },
      { key: 'passed', label: 'Passed' }
    ];
  } else if (billType.includes('AMENDMENT')) {
    stages = [
      { key: 'drafted', label: 'Drafted' },
      { key: 'submitted', label: 'Submitted' },
      { key: 'debate', label: 'Debate' },
      { key: 'vote', label: 'Vote' },
      { key: 'incorporated', label: 'Incorporated' }
    ];
  } else {
    // Default: Bill or Joint Resolution
    stages = [
      { key: 'introduced', label: 'Introduced' },
      { key: 'committee', label: 'Committee' },
      { key: 'markup', label: 'Markup' },
      { key: 'vote', label: 'Vote' },
      { key: 'passed', label: 'Passed' },
      { key: 'signed', label: 'Signed' }
    ];
  }

  // 3. Analyze actual congressional actions to determine current stage
  const actions = event.actions || [];
  let currentStageIdx = 0;
  
  // Map specific congressional actions to stages
  for (const action of actions) {
    const actionText = action.text.toLowerCase();
    
    // For resolutions
    if (billType.includes('RESOLUTION')) {
      if (actionText.includes('introduced')) {
        currentStageIdx = Math.max(currentStageIdx, 0); // Introduced
      }
      if (actionText.includes('referred') && actionText.includes('committee')) {
        currentStageIdx = Math.max(currentStageIdx, 1); // Committee
      }
      if (actionText.includes('reported') || actionText.includes('ordered to be reported')) {
        currentStageIdx = Math.max(currentStageIdx, 2); // Floor
      }
      if (actionText.includes('passed') || actionText.includes('agreed to') || actionText.includes('submitted') && actionText.includes('agreed to')) {
        currentStageIdx = Math.max(currentStageIdx, 3); // Passed
      }
    } else {
      // For bills
      if (actionText.includes('introduced')) {
        currentStageIdx = Math.max(currentStageIdx, 0); // Introduced
      }
      if (actionText.includes('referred') && actionText.includes('committee')) {
        currentStageIdx = Math.max(currentStageIdx, 1); // Committee
      }
      if (actionText.includes('markup') || actionText.includes('ordered to be reported')) {
        currentStageIdx = Math.max(currentStageIdx, 2); // Markup
      }
      if (actionText.includes('placed on calendar') || actionText.includes('floor') || actionText.includes('vote') && !actionText.includes('passed')) {
        currentStageIdx = Math.max(currentStageIdx, 3); // Vote
      }
      if (actionText.includes('passed') || actionText.includes('agreed to') || actionText.includes('enacted')) {
        currentStageIdx = Math.max(currentStageIdx, 4); // Passed
      }
      if (actionText.includes('signed') || actionText.includes('enacted')) {
        currentStageIdx = Math.max(currentStageIdx, 5); // Signed
      }
    }
  }
  
  // Only override with event type if actions don't indicate a later stage
  const eventType = (event.type || '').toLowerCase();
  if (currentStageIdx < 2 && eventType === 'markup') {
    currentStageIdx = Math.max(currentStageIdx, stages.findIndex(s => s.key === 'markup'));
  } else if (currentStageIdx < 1 && eventType === 'hearing') {
    currentStageIdx = Math.max(currentStageIdx, stages.findIndex(s => s.key === 'committee'));
  } else if (currentStageIdx < 3 && (eventType === 'vote' || eventType === 'floor')) {
    currentStageIdx = Math.max(currentStageIdx, stages.findIndex(s => s.key === 'floor'));
  }

  // Ensure we don't exceed array bounds
  currentStageIdx = Math.min(currentStageIdx, stages.length - 1);

  // 4. Assign status to each stage with robust matching and planned support
  const stageKeywords: Record<string, string[]> = {
    introduced: ['introduced', 'introduction'],
    committee: ['committee', 'referred', 'referral', 'reported'],
    markup: ['markup', 'amendment', 'amended'],
    vote: ['vote', 'voted', 'floor', 'debate'],
    passed: ['passed', 'agreed to', 'approved', 'enacted'],
    signed: ['signed', 'enacted', 'becomes law']
  };

  // Helper function to get appropriate label based on status
  const getStageLabel = (stage: { key: string; label: string }, status: string) => {
    const pastTenseMap: Record<string, string> = {
      'introduced': 'Introduced',
      'committee': 'Referred to Committee',
      'markup': 'Marked Up',
      'vote': 'Voted On',
      'passed': 'Passed',
      'signed': 'Signed',
      'drafted': 'Drafted',
      'submitted': 'Submitted',
      'debate': 'Debated',
      'incorporated': 'Incorporated'
    };
    
    const upcomingActionMap: Record<string, string> = {
      'introduced': 'Introduction',
      'committee': 'Up for Committee Vote',
      'markup': 'Up for Markup',
      'vote': 'Up for Floor Vote',
      'passed': 'Up for Final Vote',
      'signed': 'Up for Signature',
      'drafted': 'Drafting',
      'submitted': 'Submission',
      'debate': 'Up for Debate',
      'incorporated': 'Up for Incorporation'
    };

    if (status === 'completed' || status === 'current') {
      return pastTenseMap[stage.key] || stage.label;
    } else {
      return upcomingActionMap[stage.key] || stage.label;
    }
  };

  const result = stages.map((stage, idx) => {
    // Use robust keyword matching for actions
    const keywords = stageKeywords[stage.key] || [stage.key];
    const matchingAction = actions.find((a: any) =>
      keywords.some(keyword => a.text.toLowerCase().includes(keyword))
    );
    const stageDate = matchingAction ? matchingAction.actionDate : undefined;
    
    let status: string;
    if (idx < currentStageIdx) {
      status = 'completed';
    } else if (idx === currentStageIdx) {
      status = 'current';
    } else {
      status = 'planned';
    }
    
    const label = getStageLabel(stage, status);
    
    if (status === 'completed') {
      return { ...stage, label, status, date: stageDate };
    } else if (status === 'current') {
      return { ...stage, label, status, date: stageDate };
    } else {
      return { ...stage, label, status, date: undefined };
    }
  });

  return result;
} 