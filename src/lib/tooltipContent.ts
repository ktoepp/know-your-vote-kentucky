export interface TooltipContent {
  title: string;
  content: string;
}

export interface BillTooltipContent extends TooltipContent {
  billNumber: string;
  fullTitle: string;
  sponsor: string;
  chamber: 'house' | 'senate';
}

export const governmentTooltips: Record<string, TooltipContent> = {
  // Legislative Process - Concise Definitions
  committee: {
    title: "Committee",
    content: "A specialized group of Congress members who review bills in specific policy areas. They hold hearings, make changes, and decide whether bills advance to the full chamber."
  },
  
  subcommittee: {
    title: "Subcommittee", 
    content: "A smaller, specialized group within a committee that focuses on specific topics within the committee's jurisdiction."
  },
  
  markup: {
    title: "Markup Session",
    content: "A committee meeting where members review a bill line by line, propose changes, and vote on whether to advance it to the full chamber."
  },
  
  hearing: {
    title: "Congressional Hearing",
    content: "A formal meeting where committee members question experts, officials, or stakeholders about an issue before making policy decisions."
  },
  
  floorVote: {
    title: "Floor Vote",
    content: "A vote by all members of the House (435) or Senate (100) on a bill. This is the chamber's final decision on whether to pass the bill."
  },
  
  cloture: {
    title: "Cloture Vote",
    content: "A Senate procedure to end debate and force a vote. Requires 60 senators to agree. Used to overcome filibusters."
  },
  
  // Bill Status - Clear Stage Descriptions
  introduced: {
    title: "Bill Introduced",
    content: "A member of Congress officially submits a bill to their chamber. The bill receives a number and is assigned to a committee for review."
  },
  
  referred: {
    title: "Bill Referred",
    content: "The bill is assigned to a committee that specializes in the bill's subject matter for detailed review."
  },
  
  reported: {
    title: "Reported from Committee",
    content: "The committee has finished reviewing the bill and recommends it for consideration by the full chamber."
  },
  
  passed: {
    title: "Passed Chamber",
    content: "The full House or Senate has approved the bill. If it's a House bill, it now goes to the Senate (and vice versa)."
  },
  
  enrolled: {
    title: "Enrolled",
    content: "Both chambers have passed identical versions of the bill. It's being prepared in final form to send to the President."
  },
  
  enacted: {
    title: "Enacted",
    content: "The President has signed the bill into law, or Congress has overridden a veto. The bill is now law."
  },
  
  vetoed: {
    title: "Vetoed",
    content: "The President has rejected the bill. Congress can override with a two-thirds vote in both chambers."
  },
  
  // People and Roles - Clear Definitions
  sponsor: {
    title: "Bill Sponsor",
    content: "The member of Congress who introduced the bill. They are the primary advocate for the legislation."
  },
  
  cosponsor: {
    title: "Cosponsor",
    content: "Additional members of Congress who officially support the bill by adding their names to it."
  },
  
  whip: {
    title: "Party Whip",
    content: "A party leader who counts votes and ensures party members support the party's position on legislation."
  },
  
  // Voting - Clear Explanations
  rollCall: {
    title: "Roll Call Vote",
    content: "A formal vote where each member's position is recorded by name, creating a public record of how everyone voted."
  },
  
  voiceVote: {
    title: "Voice Vote",
    content: "A quick vote where members shout 'aye' or 'no.' The presiding officer determines which side was louder. No individual votes are recorded."
  },
  
  amendment: {
    title: "Amendment",
    content: "A proposed change to a bill. Members can suggest modifications before the final vote."
  },
  
  // Process Terms - Concise Explanations
  reconciliation: {
    title: "Budget Reconciliation",
    content: "A Senate process for budget bills that requires only 51 votes instead of 60. Bypasses the filibuster but has strict rules."
  },
  
  filibuster: {
    title: "Filibuster",
    content: "A Senate tactic where members talk continuously to delay or prevent a vote. Can only be stopped by a cloture vote (60 senators)."
  },
  
  pocket_veto: {
    title: "Pocket Veto",
    content: "When the President kills a bill by not signing it within 10 days while Congress is not in session."
  },
  
  // Chambers and Structure - Clear Descriptions
  house: {
    title: "House of Representatives",
    content: "The larger chamber of Congress with 435 members serving 2-year terms. Representation is based on state population."
  },
  
  senate: {
    title: "U.S. Senate",
    content: "The smaller chamber of Congress with 100 members (2 from each state) serving 6-year terms. Every state has equal representation."
  },
  
  // Document Types - Clear Definitions
  conference_report: {
    title: "Conference Report", 
    content: "A compromise version of a bill when the House and Senate pass different versions. Both chambers must approve the compromise."
  },
  
  committee_report: {
    title: "Committee Report",
    content: "A document explaining the committee's recommendation on a bill, including analysis, cost estimates, and minority opinions."
  },

  // Additional Terms - Concise Definitions
  caucus: {
    title: "Caucus",
    content: "A group of members who share common interests or goals, such as party affiliation, ideology, or specific issues."
  },

  quorum: {
    title: "Quorum",
    content: "The minimum number of members required to conduct business: 218 in the House, 51 in the Senate."
  },

  unanimous_consent: {
    title: "Unanimous Consent",
    content: "A Senate procedure where all members agree to something without a formal vote. Any objection stops the process."
  },

  suspension: {
    title: "Suspension of the Rules",
    content: "A House procedure to quickly pass non-controversial bills. Requires a two-thirds majority vote."
  },

  discharge_petition: {
    title: "Discharge Petition",
    content: "A way to force a bill out of committee if the committee refuses to act. Requires signatures from 218 House members."
  },

  // Status Terms - Clear Descriptions
  calendar: {
    title: "Calendar",
    content: "The schedule of bills waiting for floor consideration. Different calendars exist for different types of legislation."
  },

  motion_to_reconsider: {
    title: "Motion to Reconsider",
    content: "A request to vote again on a bill that was just voted on. Must be made by someone who voted with the winning side."
  },

  // Leadership Roles - Clear Definitions
  majority_leader: {
    title: "Majority Leader",
    content: "The leader of the party that controls the chamber. They set the legislative agenda and schedule votes."
  },

  minority_leader: {
    title: "Minority Leader",
    content: "The leader of the party that doesn't control the chamber. They coordinate opposition strategy."
  },

  speaker: {
    title: "Speaker of the House",
    content: "The presiding officer of the House, elected by the majority party. Controls the flow of legislation and maintains order."
  },

  president_pro_tempore: {
    title: "President Pro Tempore",
    content: "The presiding officer of the Senate when the Vice President is absent. Usually the longest-serving majority party member."
  },

  // Timeline Stages - Clear Process Descriptions
  timeline_introduced: {
    title: "Bill Introduction",
    content: "A member of Congress officially submits a bill to their chamber. The bill receives a number and is assigned to a committee."
  },

  timeline_committee: {
    title: "Committee Review",
    content: "A specialized committee reviews the bill, holds hearings, and decides whether to advance it to the full chamber."
  },

  timeline_markup: {
    title: "Markup Session",
    content: "Committee members review the bill line by line, propose changes, and vote on whether to advance it."
  },

  timeline_vote: {
    title: "Floor Vote",
    content: "All members of the chamber vote on the bill. This represents the chamber's decision on whether to pass the bill."
  },

  timeline_passed: {
    title: "Final Passage",
    content: "The bill has been approved by one chamber and is sent to the other chamber for consideration."
  },

  timeline_signed: {
    title: "Presidential Action",
    content: "The bill has passed both chambers and is sent to the President for signature, veto, or automatic enactment."
  }
};

// Helper function to create bill-specific tooltip content
export const createBillTooltip = (
  billNumber: string,
  fullTitle: string,
  sponsor: string,
  chamber: 'house' | 'senate'
): BillTooltipContent => {
  const normalizedNumber = normalizeBillNumber(billNumber);
  const chamberName = chamber === 'house' ? 'House' : 'Senate';
  
  return {
    title: `${chamberName} Bill ${normalizedNumber}`,
    content: `${fullTitle}`,
    billNumber: normalizedNumber,
    fullTitle,
    sponsor,
    chamber
  };
};

// Helper function to normalize bill numbers
export const normalizeBillNumber = (billNumber: string): string => {
  // Remove common prefixes and normalize format
  const normalized = billNumber
    .replace(/^(hr|h\.r\.|house resolution|h\.r\.)/i, 'H.R.')
    .replace(/^(s|s\.|senate bill|s\.)/i, 'S.')
    .replace(/^(hjres|h\.j\.res\.|house joint resolution|h\.j\.res\.)/i, 'H.J.Res.')
    .replace(/^(sjres|s\.j\.res\.|senate joint resolution|s\.j\.res\.)/i, 'S.J.Res.')
    .replace(/^(hconres|h\.con\.res\.|house concurrent resolution|h\.con\.res\.)/i, 'H.Con.Res.')
    .replace(/^(sconres|s\.con\.res\.|senate concurrent resolution|s\.con\.res\.)/i, 'S.Con.Res.')
    .replace(/^(hres|h\.res\.|house resolution|h\.res\.)/i, 'H.Res.')
    .replace(/^(sres|s\.res\.|senate resolution|s\.res\.)/i, 'S.Res.');
  
  return normalized;
};

// Helper function to get tooltip content by key
export const getTooltipContent = (key: string): TooltipContent | null => {
  return governmentTooltips[key] || null;
};

// Helper function to check if a term has tooltip content
export const hasTooltipContent = (key: string): boolean => {
  return key in governmentTooltips;
};

// Vote explanation tooltips - Concise and clear
export const voteExplanations: Record<string, string> = {
  yes: "Voted in favor of the bill or amendment",
  no: "Voted against the bill or amendment", 
  abstain: "Chose not to vote, often due to conflict of interest",
  not_voting: "Was absent or chose not to participate in this vote",
  present: "Was present but chose not to vote either way"
};

// Bill status explanations - Clear stage descriptions
export const billStatusExplanations: Record<string, string> = {
  introduced: "Bill has been officially submitted to Congress",
  referred: "Bill has been assigned to a committee for review",
  reported: "Committee has finished reviewing and recommends the bill",
  passed: "Bill has been approved by one chamber of Congress",
  enrolled: "Both chambers have passed identical versions of the bill",
  enacted: "Bill has been signed into law by the President",
  vetoed: "President has rejected the bill",
  failed: "Bill did not receive enough votes to pass"
}; 