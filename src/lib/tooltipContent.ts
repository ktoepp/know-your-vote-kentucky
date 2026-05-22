/**
 * Glossary buckets used by `/glossary` and the per-tooltip "Learn more"
 * affordance. The order here is the order categories render on the glossary
 * page, so put broader/foundational concepts first.
 */
export type TooltipCategory =
  | 'bill_types'
  | 'bill_status_and_stages'
  | 'legislative_bodies_and_people'
  | 'procedures_and_voting'
  | 'districts_and_geography'
  | 'external_references'
  | 'subject_topics';

export const TOOLTIP_CATEGORY_ORDER: TooltipCategory[] = [
  'bill_types',
  'bill_status_and_stages',
  'legislative_bodies_and_people',
  'procedures_and_voting',
  'districts_and_geography',
  'external_references',
  'subject_topics',
];

export const TOOLTIP_CATEGORY_LABELS: Record<TooltipCategory, string> = {
  bill_types: 'Bill Types',
  bill_status_and_stages: 'Bill Status & Stages',
  legislative_bodies_and_people: 'Legislative Bodies & People',
  procedures_and_voting: 'Procedures & Voting',
  districts_and_geography: 'Districts & Geography',
  external_references: 'External References',
  subject_topics: 'Subject Topics',
};

export interface TooltipContent {
  title: string;
  content: string;
  category: TooltipCategory;
}

export interface BillTooltipContent extends Omit<TooltipContent, 'category'> {
  billNumber: string;
  fullTitle: string;
  sponsor: string;
  chamber: 'house' | 'senate';
  category?: TooltipCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// All definitions below are specific to the KENTUCKY GENERAL ASSEMBLY,
// not the U.S. Congress. Kentucky has 100 House members and 38 Senators;
// vetoes require a 3/5 override; there is no filibuster or cloture.
// ─────────────────────────────────────────────────────────────────────────────

export const governmentTooltips: Record<string, TooltipContent> = {

  // ── Bill Types ──────────────────────────────────────────────────────────────

  hb: {
    category: 'bill_types',
    title: "House Bill (HB)",
    content: "A proposed law introduced in the Kentucky House of Representatives. To become law, it has to pass the House, pass the Senate, and then go to the Governor."
  },

  sb: {
    category: 'bill_types',
    title: "Senate Bill (SB)",
    content: "A proposed law introduced in the Kentucky Senate. To become law, it has to pass the Senate, pass the House, and then go to the Governor."
  },

  hjr: {
    category: 'bill_types',
    title: "House Joint Resolution (HJR)",
    content: "A formal action that needs approval from both the House and Senate. Often used to propose constitutional amendments or make official statements."
  },

  sjr: {
    category: 'bill_types',
    title: "Senate Joint Resolution (SJR)",
    content: "Same as a House Joint Resolution, but introduced in the Senate. Needs approval from both chambers."
  },

  hcr: {
    category: 'bill_types',
    title: "House Concurrent Resolution (HCR)",
    content: "A statement that expresses the position of both chambers, but doesn't become law. Often used for official acknowledgments or to direct state agencies."
  },

  scr: {
    category: 'bill_types',
    title: "Senate Concurrent Resolution (SCR)",
    content: "Same as a House Concurrent Resolution, but introduced in the Senate."
  },

  hr: {
    category: 'bill_types',
    title: "House Resolution (HR)",
    content: "A resolution that only affects the House of Representatives itself — such as internal rules or ceremonial recognitions. The Senate doesn't have to approve it."
  },

  sr: {
    category: 'bill_types',
    title: "Senate Resolution (SR)",
    content: "A resolution that only affects the Senate itself. The House doesn't have to approve it."
  },

  // ── Bill Status / Actions ───────────────────────────────────────────────────

  introduced: {
    category: 'bill_status_and_stages',
    title: "Introduced",
    content: "A legislator has formally filed this bill. It has received a number but has not yet been voted on by any committee or the full chamber."
  },

  prefiled: {
    category: 'bill_status_and_stages',
    title: "Prefiled",
    content: "The bill was submitted to the Legislative Research Commission (LRC) before the legislative session officially began. Prefiling lets members get a head start on drafting."
  },

  referred: {
    category: 'bill_status_and_stages',
    title: "Referred to Committee",
    content: "The bill has been assigned to a smaller group of legislators who specialize in this policy area. The committee will review it, hold hearings, and decide whether to advance it."
  },

  first_reading: {
    category: 'bill_status_and_stages',
    title: "First Reading",
    content: "Kentucky law requires each bill to be read aloud three times before a final vote. The first reading is a procedural step — usually just the bill's title — that officially starts the process."
  },

  second_reading: {
    category: 'bill_status_and_stages',
    title: "Second Reading",
    content: "The second required reading of the bill. At this point the bill is typically referred to a committee for review."
  },

  third_reading: {
    category: 'bill_status_and_stages',
    title: "Third Reading",
    content: "The final required reading before the full chamber votes. A bill that passes on third reading moves to the other chamber."
  },

  in_committee: {
    category: 'bill_status_and_stages',
    title: "In Committee",
    content: "The bill is being reviewed by the assigned committee. Members may hold hearings, propose changes, and eventually vote on whether to send it to the full chamber."
  },

  reported: {
    category: 'bill_status_and_stages',
    title: "Reported Favorably",
    content: "The committee reviewed the bill and recommends the full chamber vote yes on it. The bill now moves to the floor for debate and a vote."
  },

  reported_favorably_with_committee_substitute: {
    category: 'bill_status_and_stages',
    title: "Reported with Committee Substitute",
    content: "The committee recommends the bill, but replaced the original text with a revised version. The substitute can be a minor tweak or a major rewrite — it's still the same bill number."
  },

  committee_substitute: {
    category: 'bill_status_and_stages',
    title: "Committee Substitute",
    content: "A revised version of the bill written by the committee. It replaces the original text but keeps the same bill number. Sometimes called a 'CS.'"
  },

  posted_for_passage: {
    category: 'bill_status_and_stages',
    title: "Posted for Passage",
    content: "The bill has been placed on the calendar and is scheduled for a vote by the full chamber. This is one of the last steps before a floor vote."
  },

  floor_amendment: {
    category: 'bill_status_and_stages',
    title: "Floor Amendment",
    content: "A change proposed to the bill while it is being debated by the full chamber — not in committee. Any member can offer a floor amendment."
  },

  passed: {
    category: 'bill_status_and_stages',
    title: "Passed",
    content: "The full House or Senate voted to approve the bill. It now moves to the other chamber, where it will go through its own committee review and floor vote."
  },

  passed_chamber: {
    category: 'bill_status_and_stages',
    title: "Passed Chamber",
    content: "The bill cleared one chamber (House or Senate) and has been sent to the other for consideration."
  },

  engrossed: {
    category: 'bill_status_and_stages',
    title: "Engrossed",
    content: "The bill passed one chamber and has been printed in its final, amended form — ready to be formally sent to the other chamber."
  },

  enrolled: {
    category: 'bill_status_and_stages',
    title: "Enrolled",
    content: "Both the House and Senate have passed the bill. It has been reviewed for accuracy, signed by the leadership of each chamber, and sent to the Governor for action."
  },

  enacted: {
    category: 'bill_status_and_stages',
    title: "Enacted / Became Law",
    content: "The Governor signed the bill, or it became law without the Governor's signature. It is now a Kentucky state law."
  },

  signed_by_governor: {
    category: 'bill_status_and_stages',
    title: "Signed by Governor",
    content: "The Governor has approved and signed the bill. It still must be enrolled, delivered to the Secretary of State, and chaptered in the Kentucky Revised Statutes before it is fully on the books as state law."
  },

  chaptered: {
    category: 'bill_status_and_stages',
    title: "Chaptered",
    content: "The bill has been assigned a chapter number in the Kentucky Revised Statutes (KRS) and filed with the Secretary of State. Chaptering is the final formal step — the measure is now part of Kentucky law."
  },

  vetoed: {
    category: 'bill_status_and_stages',
    title: "Vetoed",
    content: "The Governor rejected the bill. The General Assembly can attempt to override the veto — which requires 3/5 of the members elected to each chamber (61 House members and 23 Senators)."
  },

  veto_override: {
    category: 'bill_status_and_stages',
    title: "Veto Override",
    content: "The General Assembly voted to pass the bill despite the Governor's veto. Kentucky requires 3/5 of elected members in each chamber (61 in the House, 23 in the Senate) to override."
  },

  tabled: {
    category: 'bill_status_and_stages',
    title: "Tabled",
    content: "The bill has been set aside indefinitely. This effectively ends the bill's progress for this session without a direct up-or-down vote."
  },

  /** Minor / routine docket line — LegiScan flags these with importance 0. */
  clerical: {
    category: 'bill_status_and_stages',
    title: "Routine procedural step",
    content:
      "A routine paperwork step — like a clerk's note that the bill was read or sent to a committee — that doesn't change the bill itself. Real progress happens when a committee or the full chamber actually votes."
  },

  recommitted: {
    category: 'bill_status_and_stages',
    title: "Recommitted",
    content: "The bill was sent back to committee after already reaching the floor. This usually happens to allow further amendments or to slow the bill's progress."
  },

  failed: {
    category: 'bill_status_and_stages',
    title: "Failed",
    content: "The bill did not receive enough votes to pass. It will not become law in this session."
  },

  adjourned_sine_die: {
    category: 'bill_status_and_stages',
    title: "Adjourned Sine Die",
    content: "'Sine die' is Latin for 'without a day' — meaning no return date is set. When the General Assembly adjourns sine die, the session is officially over. Any bills not yet passed are dead until the next session."
  },

  // ── Legislative Bodies & People ─────────────────────────────────────────────

  general_assembly: {
    category: 'legislative_bodies_and_people',
    title: "Kentucky General Assembly",
    content: "Kentucky's state legislature. It has two chambers: the House of Representatives (100 members) and the Senate (38 members). It meets every year in Frankfort."
  },

  house: {
    category: 'legislative_bodies_and_people',
    title: "Kentucky House of Representatives",
    content: "One of the two chambers of the Kentucky General Assembly. It has 100 members, each representing a district across the state. Members serve 2-year terms."
  },

  senate: {
    category: 'legislative_bodies_and_people',
    title: "Kentucky Senate",
    content: "One of the two chambers of the Kentucky General Assembly. It has 38 members, each representing a district across the state. Senators serve 4-year terms, with roughly half up for election every two years."
  },

  committee: {
    category: 'legislative_bodies_and_people',
    title: "Committee",
    content: "A smaller group of legislators that focuses on a specific policy area, such as Education or Judiciary. Committees hold hearings, dig into the details of bills, and decide whether to send them on to the full chamber."
  },

  subcommittee: {
    category: 'legislative_bodies_and_people',
    title: "Subcommittee",
    content: "A smaller working group inside a committee that focuses on a narrower topic. Subcommittees often do the first detailed review of a bill before the full committee votes."
  },

  lrc: {
    category: 'legislative_bodies_and_people',
    title: "Legislative Research Commission (LRC)",
    content: "The nonpartisan staff agency that supports the Kentucky General Assembly. The LRC drafts bills, does research, and runs the legislature's day-to-day operations. It's overseen by a committee of legislative leaders."
  },

  sponsor: {
    category: 'legislative_bodies_and_people',
    title: "Sponsor",
    content: "The legislator who wrote and introduced the bill. They're the bill's main advocate as it moves through the process."
  },

  cosponsor: {
    category: 'legislative_bodies_and_people',
    title: "Co-sponsor",
    content: "A legislator who formally signs on to support a bill someone else wrote. Co-sponsors show that a bill has broader support, but they didn't author it."
  },

  speaker: {
    category: 'legislative_bodies_and_people',
    title: "Speaker of the House",
    content: "The elected leader of the Kentucky House of Representatives. The Speaker decides which bills get floor time, assigns members to committees, and keeps order during debate."
  },

  senate_president: {
    category: 'legislative_bodies_and_people',
    title: "President of the Senate",
    content: "The elected leader of the Kentucky Senate. The President sets the Senate's agenda, assigns members to committees, and runs floor proceedings."
  },

  majority_leader: {
    category: 'legislative_bodies_and_people',
    title: "Majority Leader",
    content: "The floor leader for the party that holds the most seats in the chamber. Works with the Speaker or Senate President to set the agenda and guide their party's members."
  },

  minority_leader: {
    category: 'legislative_bodies_and_people',
    title: "Minority Leader",
    content: "The leader of the party that doesn't hold the most seats in the chamber. Coordinates the minority party's response to legislation and represents its members."
  },

  whip: {
    category: 'legislative_bodies_and_people',
    title: "Party Whip",
    content: "A party leader who keeps track of how members plan to vote and works to line up support for the party's position on key votes."
  },

  // ── Voting ──────────────────────────────────────────────────────────────────

  rollCall: {
    category: 'procedures_and_voting',
    title: "Roll Call Vote",
    content: "A vote where each legislator's position is recorded by name. This creates a public record of exactly how your representative voted."
  },

  voiceVote: {
    category: 'procedures_and_voting',
    title: "Voice Vote",
    content: "Members shout 'aye' or 'nay,' and the presiding officer decides which side is louder. No individual votes are recorded, so you can't look up how your rep voted on a voice vote."
  },

  amendment: {
    category: 'procedures_and_voting',
    title: "Amendment",
    content: "A proposed change to a bill's text. Amendments can be offered in committee or on the floor by any member."
  },

  yeas_nays: {
    category: 'procedures_and_voting',
    title: "Yeas / Nays",
    content: "The official count of yes votes (yeas) and no votes (nays) on a bill or amendment."
  },

  // ── Procedure ───────────────────────────────────────────────────────────────

  quorum: {
    category: 'procedures_and_voting',
    title: "Quorum",
    content: "The minimum number of members that have to be present for the chamber to do official business. In Kentucky, that's a majority of each chamber — at least 51 of 100 House members, or 20 of 38 Senators."
  },

  unanimous_consent: {
    category: 'procedures_and_voting',
    title: "Unanimous Consent",
    content: "When every member agrees to something without holding a formal vote — for example, skipping a procedural reading or extending debate time. Any single member can object and block it."
  },

  discharge_petition: {
    category: 'procedures_and_voting',
    title: "Discharge Petition",
    content: "A motion to pull a bill out of committee without the committee's approval. In Kentucky, it has to be filed a day ahead of time, and it's rarely used."
  },

  calendar: {
    category: 'procedures_and_voting',
    title: "Calendar",
    content: "The official schedule of bills waiting for a floor vote. Being 'placed on the calendar' means a bill is next in line for the full chamber to vote on."
  },

  hearing: {
    category: 'procedures_and_voting',
    title: "Committee Hearing",
    content: "A formal meeting where a committee hears testimony from experts, advocates, affected residents, or state agencies about a bill before deciding whether to advance it."
  },

  floorVote: {
    category: 'procedures_and_voting',
    title: "Floor Vote",
    content: "A vote by the full chamber — all 100 House members or all 38 Senators — on whether to pass a bill. This is the chamber's official decision."
  },

  conference_committee: {
    category: 'procedures_and_voting',
    title: "Conference Committee",
    content: "A temporary joint group of House and Senate members that's set up to work out the differences when the two chambers pass different versions of the same bill. Both chambers have to approve the final compromise."
  },

  conference_report: {
    category: 'procedures_and_voting',
    title: "Conference Report",
    content: "The compromise version of a bill produced by a conference committee. Both chambers have to vote yes or no on it as written — no more amendments are allowed."
  },

  motion_to_reconsider: {
    category: 'procedures_and_voting',
    title: "Motion to Reconsider",
    content: "A request to hold another vote on something that was just decided. In Kentucky, only a member who voted on the winning side can make this motion."
  },

  // ── Special Provisions ──────────────────────────────────────────────────────

  emergency_clause: {
    category: 'procedures_and_voting',
    title: "Emergency Clause",
    content: "A provision that makes a law take effect as soon as the Governor signs it, instead of waiting 90 days. It takes a supermajority — 3/5 of the members elected to each chamber — to add one."
  },

  fiscal_note: {
    category: 'procedures_and_voting',
    title: "Fiscal Note",
    content: "An official estimate of how much a bill would cost (or save) the state if it becomes law. It's prepared by the Legislative Research Commission or the Governor's Office for Policy and Management."
  },

  // ── Timeline Stage Labels ───────────────────────────────────────────────────

  timeline_introduced: {
    category: 'bill_status_and_stages',
    title: "Introduced",
    content: "A legislator has formally filed this bill with the General Assembly. It now has a bill number and will be assigned to a committee."
  },

  timeline_committee: {
    category: 'bill_status_and_stages',
    title: "Committee Review",
    content: "The bill is being reviewed by a specialized committee. Members may hold hearings, propose changes, and vote on whether to send it to the full chamber."
  },

  timeline_markup: {
    category: 'bill_status_and_stages',
    title: "Committee Amendments",
    content: "The committee is actively reviewing and changing the bill's text before deciding whether to send it to the full chamber."
  },

  timeline_vote: {
    category: 'bill_status_and_stages',
    title: "Floor Vote",
    content: "The full chamber — all 100 House members or all 38 Senators — is voting on whether to pass the bill."
  },

  timeline_passed: {
    category: 'bill_status_and_stages',
    title: "Passed a Chamber",
    content: "The bill cleared one chamber and has been sent to the other. It now has to go through committee review and a floor vote in that second chamber."
  },

  timeline_signed: {
    category: 'bill_status_and_stages',
    title: "Governor's Action",
    content: "The bill has passed both chambers and is waiting on the Governor's decision: sign it into law, veto it, or let it become law without a signature."
  },

  // ── Ballot / Member Page Terms ──────────────────────────────────────────────

  representative: {
    category: 'legislative_bodies_and_people',
    title: "State Representative",
    content: "A member of the Kentucky House of Representatives. Kentucky has 100 representatives, each elected from a geographic district to a 2-year term."
  },

  senator: {
    category: 'legislative_bodies_and_people',
    title: "State Senator",
    content: "A member of the Kentucky Senate. Kentucky has 38 senators, each elected from a geographic district to a 4-year term."
  },

  house_district: {
    category: 'districts_and_geography',
    title: "House District",
    content: "The geographic area a Kentucky House member represents. Kentucky has 100 House districts and every Kentuckian lives in one. Your House rep is elected only by voters in your district."
  },

  senate_district: {
    category: 'districts_and_geography',
    title: "Senate District",
    content: "The geographic area a Kentucky Senator represents. Kentucky has 38 Senate districts, each covering a larger area than a House district. You have both a House rep and a Senate rep."
  },

  ballotpedia: {
    category: 'external_references',
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

/** Tooltip content for roll-call vote-count chips (Yea / Nay / NV). */
export const voteCountTooltips: Record<string, TooltipContent> = {
  yea: {
    category: 'procedures_and_voting',
    title: "Yea (Yes) Votes",
    content: "The number of legislators who voted for the bill or amendment. A bill usually needs a simple majority of members present to pass."
  },
  nay: {
    category: 'procedures_and_voting',
    title: "Nay (No) Votes",
    content: "The number of legislators who voted against the bill or amendment."
  },
  nv: {
    category: 'procedures_and_voting',
    title: "Not Voting (NV)",
    content: "Legislators who were present but didn't cast a vote, or who were absent. Not-voting members don't count toward the total needed to pass."
  },
  absent: {
    category: 'procedures_and_voting',
    title: "Absent",
    content: "Legislators who weren't present during the vote. Absent members don't affect the outcome."
  },

  // ── Subject Topics (KY_TOPICS taxonomy) ─────────────────────────────────────

  topic_education: {
    category: 'subject_topics',
    title: "Education",
    content: "K–12 public schools, charters, teachers and school staff, curriculum, school funding (SEEK), and student programs. Covers items like JCPS, FCPS, charter schools, and superintendent matters."
  },
  topic_healthcare: {
    category: 'subject_topics',
    title: "Healthcare",
    content: "Hospitals, clinics, Medicaid, Medicare, insurance, mental health, the opioid response, pharmacies, and the healthcare workforce. (Postsecondary medical training falls under Higher Education.)"
  },
  topic_infrastructure: {
    category: 'subject_topics',
    title: "Infrastructure",
    content: "Roads, bridges, highways, water and sewer systems, broadband, transit, and major construction projects funded by the state."
  },
  topic_taxation: {
    category: 'subject_topics',
    title: "Taxation",
    content: "State and local taxes — income, sales, property, and excise — plus assessments, tax credits, and revenue policy."
  },
  topic_public_safety: {
    category: 'subject_topics',
    title: "Public Safety",
    content: "Police, fire, EMS, 911 systems, sheriffs, emergency management, and disaster response. (Courts and incarceration are under Criminal Justice and Corrections.)"
  },
  topic_environment: {
    category: 'subject_topics',
    title: "Environment",
    content: "Air, water, and land protection; mining and reclamation; wildlife; parks; and pollution rules."
  },
  topic_labor: {
    category: 'subject_topics',
    title: "Labor",
    content: "Wages, workplace safety, unemployment insurance, workers' compensation, collective bargaining, and employment standards."
  },
  topic_housing: {
    category: 'subject_topics',
    title: "Housing",
    content: "Affordable housing, landlord–tenant law, eviction, housing assistance, zoning, and homelessness response."
  },
  topic_agriculture: {
    category: 'subject_topics',
    title: "Agriculture",
    content: "Farming, livestock, crops (including hemp and tobacco), food safety, rural development, and the Kentucky Department of Agriculture's programs."
  },
  topic_energy: {
    category: 'subject_topics',
    title: "Energy",
    content: "Electricity, natural gas, coal, oil, renewables, utility regulation, and the Public Service Commission."
  },
  topic_criminal_justice: {
    category: 'subject_topics',
    title: "Criminal Justice",
    content: "Criminal laws and penalties, courts, prosecutors and defenders, sentencing, juvenile justice, and re-entry. (Day-to-day jail and prison operations are under Corrections.)"
  },
  topic_voting_rights: {
    category: 'subject_topics',
    title: "Voting Rights",
    content: "Eligibility to vote, ballot access, voter ID, registration, restoration of voting rights, and redistricting."
  },
  topic_local_government: {
    category: 'subject_topics',
    title: "Local Government",
    content: "Cities, counties, special districts, mayors and judge-executives, and rules that govern how local governments raise money and provide services."
  },
  topic_budget: {
    category: 'subject_topics',
    title: "Budget",
    content: "The state's two-year spending plan (biennial budget), appropriations bills, the Rainy Day Fund, and how state dollars are allocated across agencies."
  },
  topic_corrections: {
    category: 'subject_topics',
    title: "Corrections",
    content: "Jails, prisons, probation and parole, and Department of Corrections operations."
  },
  topic_elections: {
    category: 'subject_topics',
    title: "Elections",
    content: "How elections are run — primaries, general elections, vote-by-mail, polling places, election security, and campaign finance reporting."
  },
  topic_higher_education: {
    category: 'subject_topics',
    title: "Higher Education",
    content: "Public universities, community and technical colleges (KCTCS), tuition, financial aid (KEES), and research programs."
  },
  topic_veterans_affairs: {
    category: 'subject_topics',
    title: "Veterans Affairs",
    content: "Veterans' benefits, the Kentucky Department of Veterans Affairs, veterans' homes, and military-related programs."
  },
  topic_alcohol_cannabis: {
    category: 'subject_topics',
    title: "Alcohol & Cannabis",
    content: "Alcoholic beverage control (ABC), liquor licensing, hemp regulation, and Kentucky's medical-cannabis program."
  },
  topic_gambling: {
    category: 'subject_topics',
    title: "Gambling",
    content: "Horse racing, charitable gaming, lottery, sports betting, and historical horse racing (HHR) machines."
  },
};

/**
 * Concise one-liner bill status strings, derived from `governmentTooltips`.
 * Kept as a `Record<string, string>` for backwards compatibility with any
 * caller that imports it (currently none outside this file, but exporting
 * it preserves the API in case external scripts depend on it).
 */
const STATUS_ONE_LINER_KEYS = [
  'introduced', 'prefiled', 'referred', 'in_committee', 'reported',
  'committee_substitute', 'posted_for_passage', 'passed', 'engrossed',
  'enrolled', 'enacted', 'signed_by_governor', 'chaptered', 'vetoed',
  'veto_override', 'tabled', 'recommitted', 'failed', 'adjourned_sine_die',
] as const;

export const billStatusExplanations: Record<string, string> = Object.fromEntries(
  STATUS_ONE_LINER_KEYS
    .filter((k) => governmentTooltips[k])
    .map((k) => [k, governmentTooltips[k].content]),
);
