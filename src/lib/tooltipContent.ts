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

// ─────────────────────────────────────────────────────────────────────────────
// All definitions below are specific to the KENTUCKY GENERAL ASSEMBLY,
// not the U.S. Congress. Kentucky has 100 House members and 38 Senators;
// vetoes require a 3/5 override; there is no filibuster or cloture.
// ─────────────────────────────────────────────────────────────────────────────

export const governmentTooltips: Record<string, TooltipContent> = {

  // ── Bill Types ──────────────────────────────────────────────────────────────

  hb: {
    title: "House Bill (HB)",
    content: "A proposed law introduced in the Kentucky House of Representatives. Must pass both the House and Senate before going to the Governor."
  },

  sb: {
    title: "Senate Bill (SB)",
    content: "A proposed law introduced in the Kentucky Senate. Must pass both the Senate and House before going to the Governor."
  },

  hjr: {
    title: "House Joint Resolution (HJR)",
    content: "A formal action requiring approval from both the House and Senate. Often used to propose constitutional amendments or make official statements."
  },

  sjr: {
    title: "Senate Joint Resolution (SJR)",
    content: "Same as a House Joint Resolution, but introduced in the Senate. Requires approval from both chambers."
  },

  hcr: {
    title: "House Concurrent Resolution (HCR)",
    content: "A statement or action that expresses the position of both chambers but does not become law. Often used for official acknowledgments or directing state agencies."
  },

  scr: {
    title: "Senate Concurrent Resolution (SCR)",
    content: "Same as a House Concurrent Resolution, but introduced in the Senate."
  },

  hr: {
    title: "House Resolution (HR)",
    content: "A resolution that affects only the House of Representatives internally — such as rules or ceremonial recognitions. Does not require Senate approval."
  },

  sr: {
    title: "Senate Resolution (SR)",
    content: "A resolution that affects only the Senate internally. Does not require House approval."
  },

  // ── Bill Status / Actions ───────────────────────────────────────────────────

  introduced: {
    title: "Introduced",
    content: "A legislator has formally filed this bill. It has received a number but has not yet been voted on by any committee or the full chamber."
  },

  prefiled: {
    title: "Prefiled",
    content: "The bill was submitted to the Legislative Research Commission (LRC) before the legislative session officially began. Prefiling lets members get a head start on drafting."
  },

  referred: {
    title: "Referred to Committee",
    content: "The bill has been assigned to a smaller group of legislators who specialize in this policy area. The committee will review it, hold hearings, and decide whether to advance it."
  },

  first_reading: {
    title: "First Reading",
    content: "Kentucky law requires each bill to be read aloud three times before a final vote. The first reading is a procedural step — usually just the bill's title — that officially starts the process."
  },

  second_reading: {
    title: "Second Reading",
    content: "The second required reading of the bill. At this point the bill is typically referred to a committee for review."
  },

  third_reading: {
    title: "Third Reading",
    content: "The final required reading before the full chamber votes. A bill that passes on third reading moves to the other chamber."
  },

  in_committee: {
    title: "In Committee",
    content: "The bill is being reviewed by the assigned committee. Members may hold hearings, propose changes, and eventually vote on whether to send it to the full chamber."
  },

  reported: {
    title: "Reported Favorably",
    content: "The committee reviewed the bill and recommends the full chamber vote yes on it. The bill now moves to the floor for debate and a vote."
  },

  reported_favorably_with_committee_substitute: {
    title: "Reported with Committee Substitute",
    content: "The committee recommends the bill, but replaced the original text with a revised version. The substitute can be a minor tweak or a major rewrite — it's still the same bill number."
  },

  committee_substitute: {
    title: "Committee Substitute",
    content: "A revised version of the bill written by the committee. It replaces the original text but keeps the same bill number. Sometimes called a 'CS.'"
  },

  posted_for_passage: {
    title: "Posted for Passage",
    content: "The bill has been placed on the calendar and is scheduled for a vote by the full chamber. This is one of the last steps before a floor vote."
  },

  floor_amendment: {
    title: "Floor Amendment",
    content: "A change proposed to the bill while it is being debated by the full chamber — not in committee. Any member can offer a floor amendment."
  },

  passed: {
    title: "Passed",
    content: "The full House or Senate voted to approve the bill. It now moves to the other chamber, where it will go through its own committee review and floor vote."
  },

  passed_chamber: {
    title: "Passed Chamber",
    content: "The bill cleared one chamber (House or Senate) and has been sent to the other for consideration."
  },

  engrossed: {
    title: "Engrossed",
    content: "The bill passed one chamber and has been printed in its final, amended form — ready to be formally sent to the other chamber."
  },

  enrolled: {
    title: "Enrolled",
    content: "Both the House and Senate have passed the bill. It has been reviewed for accuracy, signed by the leadership of each chamber, and sent to the Governor for action."
  },

  enacted: {
    title: "Enacted / Became Law",
    content: "The Governor signed the bill, or it became law without the Governor's signature. It is now a Kentucky state law."
  },

  signed_by_governor: {
    title: "Signed by Governor",
    content: "The Governor has approved and signed the bill into law."
  },

  vetoed: {
    title: "Vetoed",
    content: "The Governor rejected the bill. The General Assembly can attempt to override the veto — which requires 3/5 of the members elected to each chamber (61 House members and 23 Senators)."
  },

  veto_override: {
    title: "Veto Override",
    content: "The General Assembly voted to pass the bill despite the Governor's veto. Kentucky requires 3/5 of elected members in each chamber (61 in the House, 23 in the Senate) to override."
  },

  tabled: {
    title: "Tabled",
    content: "The bill has been set aside indefinitely. This effectively ends the bill's progress for this session without a direct up-or-down vote."
  },

  /** Minor / routine docket line — LegiScan flags these with importance 0. */
  clerical: {
    title: "Routine procedural line",
    content:
      "A scheduling or docket action with no direct effect on the bill's policy or stage — for example a read-and-referred, notice, or file stamp. The substantive steps are the ones that move the bill (committee, floor votes, etc.)."
  },

  recommitted: {
    title: "Recommitted",
    content: "The bill was sent back to committee after already reaching the floor. This usually happens to allow further amendments or to slow the bill's progress."
  },

  failed: {
    title: "Failed",
    content: "The bill did not receive enough votes to pass. It will not become law in this session."
  },

  adjourned_sine_die: {
    title: "Adjourned Sine Die",
    content: "'Sine die' is Latin for 'without a day' — meaning no return date is set. When the General Assembly adjourns sine die, the session is officially over. Any bills not yet passed are dead until the next session."
  },

  // ── Legislative Bodies & People ─────────────────────────────────────────────

  general_assembly: {
    title: "Kentucky General Assembly",
    content: "Kentucky's state legislature, made up of two chambers: the House of Representatives (100 members) and the Senate (38 members). It meets annually in Frankfort."
  },

  house: {
    title: "Kentucky House of Representatives",
    content: "One of two chambers of the Kentucky General Assembly, with 100 members representing districts across the state. Members serve 2-year terms."
  },

  senate: {
    title: "Kentucky Senate",
    content: "One of two chambers of the Kentucky General Assembly, with 38 members representing districts across the state. Senators serve 4-year terms, with roughly half up for election every two years."
  },

  committee: {
    title: "Committee",
    content: "A smaller group of legislators who specialize in a specific policy area (like Education or Judiciary). Committees hold hearings, review bills in detail, and decide whether to advance them to the full chamber."
  },

  subcommittee: {
    title: "Subcommittee",
    content: "A smaller group within a committee that focuses on a specific topic within the committee's area. Subcommittees often do the initial detailed review before the full committee votes."
  },

  lrc: {
    title: "Legislative Research Commission (LRC)",
    content: "The nonpartisan staff agency that supports the Kentucky General Assembly. The LRC drafts bills, conducts research, and manages the legislature's day-to-day operations. It's run by a committee of legislative leaders."
  },

  sponsor: {
    title: "Sponsor",
    content: "The legislator who wrote and introduced the bill. They are the primary advocate for it through the process."
  },

  cosponsor: {
    title: "Co-sponsor",
    content: "A legislator who formally signs on to support a bill introduced by someone else. Co-sponsors signal broader support but did not write the bill."
  },

  speaker: {
    title: "Speaker of the House",
    content: "The elected leader of the Kentucky House of Representatives. The Speaker controls which bills get floor time, assigns members to committees, and maintains order during debate."
  },

  senate_president: {
    title: "President of the Senate",
    content: "The elected leader of the Kentucky Senate. Controls the Senate's agenda, committee assignments, and floor proceedings."
  },

  majority_leader: {
    title: "Majority Leader",
    content: "The floor leader for the party that controls the chamber. Works with the Speaker or Senate President to manage the legislative agenda and guide their party's members."
  },

  minority_leader: {
    title: "Minority Leader",
    content: "The leader of the party that does not control the chamber. Coordinates the minority party's response to legislation and represents their members' interests."
  },

  whip: {
    title: "Party Whip",
    content: "A party leader who tracks how members plan to vote and works to ensure the party's position is supported when key votes come up."
  },

  // ── Voting ──────────────────────────────────────────────────────────────────

  rollCall: {
    title: "Roll Call Vote",
    content: "A vote where each legislator's individual position is recorded by name — creating a public record of exactly how your representative voted."
  },

  voiceVote: {
    title: "Voice Vote",
    content: "Members shout 'aye' or 'nay.' The presiding officer judges which side is louder. No individual votes are recorded — you can't look up how your rep voted on a voice vote."
  },

  amendment: {
    title: "Amendment",
    content: "A proposed change to a bill's text. Amendments can be offered in committee or on the floor by any member."
  },

  yeas_nays: {
    title: "Yeas / Nays",
    content: "The official count of yes votes (yeas) and no votes (nays) on a bill or amendment."
  },

  // ── Procedure ───────────────────────────────────────────────────────────────

  quorum: {
    title: "Quorum",
    content: "The minimum number of members who must be present to conduct official business. In Kentucky, that's a majority of each chamber — at least 51 of 100 House members or 20 of 38 Senators."
  },

  unanimous_consent: {
    title: "Unanimous Consent",
    content: "When all members agree to something without a formal vote — for example, to skip a procedural reading or extend debate time. Any single member can object and block it."
  },

  discharge_petition: {
    title: "Discharge Petition",
    content: "A notice filed to attempt to pull a bill out of committee without the committee's approval. In Kentucky, it must be filed a day in advance. This is rarely used."
  },

  calendar: {
    title: "Calendar",
    content: "The official schedule of bills awaiting floor consideration. Being 'placed on the calendar' means a bill is next in line for a full chamber vote."
  },

  hearing: {
    title: "Committee Hearing",
    content: "A formal meeting where a committee listens to testimony from experts, advocates, affected citizens, or agency officials about a bill before deciding whether to advance it."
  },

  floorVote: {
    title: "Floor Vote",
    content: "A vote by the full chamber — all 100 House members or all 38 Senators — on whether to pass a bill. This is the chamber's official decision."
  },

  conference_committee: {
    title: "Conference Committee",
    content: "A temporary joint group of House and Senate members formed to resolve differences when the two chambers pass different versions of the same bill. Both chambers must approve the final compromise."
  },

  conference_report: {
    title: "Conference Report",
    content: "The compromise bill produced by a conference committee. Both chambers must vote to approve it as written — no further amendments are allowed."
  },

  motion_to_reconsider: {
    title: "Motion to Reconsider",
    content: "A request to hold another vote on something that was just decided. In Kentucky, only a member who voted on the winning side can make this motion."
  },

  // ── Special Provisions ──────────────────────────────────────────────────────

  emergency_clause: {
    title: "Emergency Clause",
    content: "A provision that makes a law take effect immediately upon the Governor's signature, rather than waiting 90 days. Requires a supermajority (3/5 of members elected to each chamber) to pass."
  },

  fiscal_note: {
    title: "Fiscal Note",
    content: "An official estimate of how much a bill would cost (or save) the state if it becomes law. Prepared by the Legislative Research Commission or the Governor's Office for Policy and Management."
  },

  // ── Timeline Stage Labels ───────────────────────────────────────────────────

  timeline_introduced: {
    title: "Introduced",
    content: "A legislator has formally filed this bill with the General Assembly. It has received a number and will be assigned to a committee."
  },

  timeline_committee: {
    title: "Committee Review",
    content: "The bill is being reviewed by a specialized committee. Members may hold hearings, propose changes, and vote on whether to send it to the full chamber."
  },

  timeline_markup: {
    title: "Committee Amendments",
    content: "The committee is actively reviewing and amending the bill's text before deciding whether to report it to the full chamber."
  },

  timeline_vote: {
    title: "Floor Vote",
    content: "The full chamber — all 100 House members or all 38 Senators — is voting on whether to pass the bill."
  },

  timeline_passed: {
    title: "Passed a Chamber",
    content: "The bill cleared one chamber and has been sent to the other. It will now go through committee review and a floor vote in the second chamber."
  },

  timeline_signed: {
    title: "Governor's Action",
    content: "The bill has passed both chambers and is awaiting the Governor's decision: sign it into law, veto it, or allow it to become law without a signature."
  },

  // ── Ballot / Member Page Terms ──────────────────────────────────────────────

  representative: {
    title: "State Representative",
    content: "A member of the Kentucky House of Representatives. Kentucky has 100 representatives, each elected from a geographic district to serve 2-year terms."
  },

  senator: {
    title: "State Senator",
    content: "A member of the Kentucky Senate. Kentucky has 38 senators, each elected from a geographic district to serve 4-year terms."
  },

  house_district: {
    title: "House District",
    content: "The geographic area a Kentucky House member represents. Kentucky has 100 House districts — every Kentuckian lives in one. Your House rep is elected solely by voters in your district."
  },

  senate_district: {
    title: "Senate District",
    content: "The geographic area a Kentucky Senator represents. Kentucky has 38 Senate districts — each covers a larger area than a House district. You have both a House rep and a Senate rep."
  },

  ballotpedia: {
    title: "Ballotpedia",
    content: "A nonpartisan, nonprofit online encyclopedia of American politics. Ballotpedia profiles include a legislator's background, campaign history, and voting record."
  },
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

// Helper function to normalize Kentucky bill numbers
export const normalizeBillNumber = (billNumber: string): string => {
  const normalized = billNumber
    .replace(/^(hb|house bill)\s*/i, 'HB ')
    .replace(/^(sb|senate bill)\s*/i, 'SB ')
    .replace(/^(hjr|house joint resolution)\s*/i, 'HJR ')
    .replace(/^(sjr|senate joint resolution)\s*/i, 'SJR ')
    .replace(/^(hcr|house concurrent resolution)\s*/i, 'HCR ')
    .replace(/^(scr|senate concurrent resolution)\s*/i, 'SCR ')
    .replace(/^(hr|house resolution)\s*/i, 'HR ')
    .replace(/^(sr|senate resolution)\s*/i, 'SR ');
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

// Bill status explanations for Kentucky General Assembly — concise one-liners
export const billStatusExplanations: Record<string, string> = {
  introduced: "Formally filed with the General Assembly; awaiting committee assignment",
  prefiled: "Submitted to LRC before session began; will be formally introduced when session opens",
  referred: "Assigned to a committee for review",
  in_committee: "Under review by the assigned committee",
  reported: "Committee recommends the bill; ready for floor consideration",
  committee_substitute: "Committee replaced the original text with a revised version",
  posted_for_passage: "Placed on the calendar and scheduled for a floor vote",
  passed: "Approved by one chamber; now moves to the other",
  engrossed: "Passed one chamber; printed in final form for transmission",
  enrolled: "Passed both chambers; signed by chamber leaders; sent to Governor",
  enacted: "Signed into law by the Governor",
  signed_by_governor: "Governor has signed the bill into law",
  vetoed: "Governor has rejected the bill; override requires 3/5 of elected members in each chamber",
  veto_override: "General Assembly voted to override the Governor's veto",
  tabled: "Set aside indefinitely; effectively ends progress this session",
  recommitted: "Sent back to committee after reaching the floor",
  failed: "Did not receive enough votes to pass",
  adjourned_sine_die: "Session has ended; unpassed bills are dead until next session"
}; 