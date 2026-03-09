import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// POLITICAL INTELLIGENCE API
// Provides high-impact activity, relevance scoring, and insights.
// For Kentucky-specific intelligence, see /api/intelligence route and:
//   - src/lib/ky-intelligence.ts (scoring & classification)
//   - src/lib/ky-content-generation.ts (AI summaries)
//   - src/lib/ky-topic-classifier.ts (topic taxonomy)
// ============================================================================

interface PoliticalIntelligenceRequest {
  type: 'weekly-briefing' | 'high-impact' | 'representative-activity' | 'legislative-journey';
  state?: string;
  district?: string;
  days?: number;
  limit?: number;
}

interface RelevanceScore {
  score: number; // 0-100
  factors: {
    urgency: number;
    impact: number;
    controversy: number;
    publicInterest: number;
    politicalDrama: number;
    deadlinePressure: number;
  };
  reasoning: string[];
  tags: string[];
}

interface PoliticalIntelligence {
  type: 'breaking' | 'background' | 'sleeper' | 'routine';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  impact: 'national' | 'regional' | 'committee' | 'procedural';
  drama: 'high' | 'medium' | 'low';
  predictions: string[];
  context: string;
  relatedIssues: string[];
}

interface LegislativeJourney {
  stage: 'introduced' | 'committee' | 'floor' | 'conference' | 'enacted' | 'vetoed';
  progress: number; // 0-100
  timeline: Array<{
    date: string;
    action: string;
    significance: 'major' | 'minor' | 'procedural';
  }>;
  nextSteps: string[];
  roadblocks: string[];
  momentum: 'accelerating' | 'steady' | 'slowing' | 'stalled';
}

// Mock data for demonstration - replace with real Congress.gov API calls
const mockHighImpactBills = [
  {
    id: 'hr-1234-119',
    congress: '119',
    billType: 'hr',
    billNumber: '1234',
    title: 'Infrastructure Investment and Jobs Act Implementation',
    introducedDate: '2024-01-15',
    sponsor: {
      fullName: 'Rep. John Smith',
      party: 'D',
      state: 'CA'
    },
    cosponsors: [
      { fullName: 'Rep. Jane Doe', party: 'R', state: 'TX' },
      { fullName: 'Rep. Bob Johnson', party: 'D', state: 'NY' }
    ],
    subjects: ['infrastructure', 'transportation', 'jobs', 'bipartisan'],
    actions: [
      { actionDate: '2024-01-15', text: 'Introduced in House', significance: 'major' },
      { actionDate: '2024-01-20', text: 'Referred to Committee', significance: 'minor' },
      { actionDate: '2024-02-01', text: 'Committee markup scheduled', significance: 'major' }
    ],
    status: 'In Committee',
    url: 'https://www.congress.gov/bill/119th-congress/house-bill/1234'
  },
  {
    id: 's-5678-119',
    congress: '119',
    billType: 's',
    billNumber: '5678',
    title: 'Healthcare Access and Affordability Act',
    introducedDate: '2024-01-10',
    sponsor: {
      fullName: 'Sen. Sarah Wilson',
      party: 'D',
      state: 'CA'
    },
    cosponsors: [
      { fullName: 'Sen. Mike Brown', party: 'R', state: 'OH' },
      { fullName: 'Sen. Lisa Garcia', party: 'D', state: 'FL' }
    ],
    subjects: ['healthcare', 'affordability', 'access', 'medicare'],
    actions: [
      { actionDate: '2024-01-10', text: 'Introduced in Senate', significance: 'major' },
      { actionDate: '2024-01-25', text: 'Committee hearing held', significance: 'major' },
      { actionDate: '2024-02-05', text: 'Committee vote scheduled', significance: 'critical' }
    ],
    status: 'Committee Vote Pending',
    url: 'https://www.congress.gov/bill/119th-congress/senate-bill/5678'
  }
];

const mockHighImpactHearings = [
  {
    id: 'hearing-house-judiciary-2024-02-15',
    congress: '119',
    chamber: 'house',
    committeeName: 'House Judiciary Committee',
    title: 'Oversight of the Federal Bureau of Investigation',
    date: '2024-02-15',
    location: 'Rayburn House Office Building, Room 2141',
    witnesses: [
      { fullName: 'Christopher Wray', organization: 'FBI', position: 'Director' },
      { fullName: 'Rep. Jim Jordan', organization: 'House Judiciary', position: 'Chairman' },
      { fullName: 'Rep. Jerry Nadler', organization: 'House Judiciary', position: 'Ranking Member' }
    ],
    bills: ['hr-1234-119'],
    description: 'Oversight hearing on FBI operations and recent controversies',
    url: 'https://judiciary.house.gov/hearing/oversight-fbi-2024-02-15'
  },
  {
    id: 'hearing-senate-intelligence-2024-02-20',
    congress: '119',
    chamber: 'senate',
    committeeName: 'Senate Intelligence Committee',
    title: 'Worldwide Threats Assessment 2024',
    date: '2024-02-20',
    location: 'Hart Senate Office Building, Room 216',
    witnesses: [
      { fullName: 'Avril Haines', organization: 'Office of Director of National Intelligence', position: 'Director' },
      { fullName: 'William Burns', organization: 'CIA', position: 'Director' },
      { fullName: 'Christopher Wray', organization: 'FBI', position: 'Director' }
    ],
    bills: [],
    description: 'Annual assessment of global threats to national security',
    url: 'https://www.intelligence.senate.gov/hearings/worldwide-threats-2024'
  }
];

const mockHighImpactVotes = [
  {
    id: 'vote-house-119-1-123',
    congress: '119',
    session: '1',
    chamber: 'house',
    voteNumber: '123',
    voteDate: '2024-02-10',
    question: 'On Passage of H.R. 1234: Infrastructure Investment and Jobs Act Implementation',
    voteType: 'passage',
    result: 'Passed',
    voteCounts: {
      yes: 218,
      no: 217,
      present: 0,
      notVoting: 0
    },
    members: [
      { fullName: 'Rep. John Smith', party: 'D', state: 'CA', vote: 'Yea' },
      { fullName: 'Rep. Jane Doe', party: 'R', state: 'TX', vote: 'Nay' }
    ],
    url: 'https://clerk.house.gov/Votes/2024123'
  }
];

// ============================================================================
// RELEVANCE SCORING ALGORITHM
// ============================================================================

function calculateRelevanceScore(item: any): RelevanceScore {
  let score = 0;
  const factors = {
    urgency: 0,
    impact: 0,
    controversy: 0,
    publicInterest: 0,
    politicalDrama: 0,
    deadlinePressure: 0,
  };
  const reasoning: string[] = [];
  const tags: string[] = [];

  // Bill-specific scoring
  if (item.billType) {
    const bill = item;
    
    // Urgency based on action frequency and deadlines
    const daysSinceIntroduced = Math.floor((Date.now() - new Date(bill.introducedDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceIntroduced < 30) {
      factors.urgency += 20;
      reasoning.push('Recently introduced bill');
      tags.push('recent');
    }

    // Impact based on cosponsors
    if (bill.cosponsors.length > 5) {
      factors.impact += 25;
      reasoning.push('High cosponsor count indicates broad support');
      tags.push('bipartisan');
    }

    // Controversy based on subject matter
    const controversialTopics = ['abortion', 'immigration', 'gun', 'climate', 'tax', 'healthcare'];
    const hasControversialTopic = bill.subjects.some((subject: string) => 
      controversialTopics.some(topic => subject.toLowerCase().includes(topic))
    );
    if (hasControversialTopic) {
      factors.controversy += 30;
      reasoning.push('Addresses controversial policy area');
      tags.push('controversial');
    }

    // Public interest based on subject relevance
    const publicInterestTopics = ['healthcare', 'education', 'veterans', 'social security', 'medicare'];
    const hasPublicInterestTopic = bill.subjects.some((subject: string) => 
      publicInterestTopics.some(topic => subject.toLowerCase().includes(topic))
    );
    if (hasPublicInterestTopic) {
      factors.publicInterest += 25;
      reasoning.push('Directly impacts daily life');
      tags.push('public-interest');
    }

    // Deadline pressure for bills approaching session end
    if (daysSinceIntroduced > 300) {
      factors.deadlinePressure += 30;
      reasoning.push('Bill approaching session end deadline');
      tags.push('deadline');
    }
  }

  // Hearing-specific scoring
  if (item.witnesses) {
    const hearing = item;
    
    // Drama based on witness list
    if (hearing.witnesses.length > 5) {
      factors.politicalDrama += 20;
      reasoning.push('High-profile witness list');
      tags.push('high-profile');
    }

    // Controversy based on hearing topic
    const controversialHearingTopics = ['oversight', 'investigation', 'contempt', 'impeachment'];
    const hasControversialTopic = controversialHearingTopics.some(topic => 
      hearing.title.toLowerCase().includes(topic)
    );
    if (hasControversialTopic) {
      factors.controversy += 35;
      reasoning.push('Oversight or investigative hearing');
      tags.push('oversight');
    }
  }

  // Vote-specific scoring
  if (item.voteCounts) {
    const vote = item;
    
    // Drama based on vote closeness
    const totalVotes = vote.voteCounts.yes + vote.voteCounts.no;
    const margin = Math.abs(vote.voteCounts.yes - vote.voteCounts.no);
    const marginPercentage = margin / totalVotes;
    
    if (marginPercentage < 0.1) {
      factors.politicalDrama += 40;
      reasoning.push('Very close vote indicates high drama');
      tags.push('close-vote');
    }

    // Impact based on vote type
    if (vote.voteType.includes('passage') || vote.voteType.includes('final')) {
      factors.impact += 30;
      reasoning.push('Final passage vote');
      tags.push('final-vote');
    }
  }

  // Calculate overall score
  score = Math.round(
    (factors.urgency + factors.impact + factors.controversy + 
     factors.publicInterest + factors.politicalDrama + factors.deadlinePressure) / 6
  );

  return {
    score,
    factors,
    reasoning,
    tags,
  };
}

// ============================================================================
// POLITICAL INTELLIGENCE GENERATION
// ============================================================================

function generatePoliticalIntelligence(item: any): PoliticalIntelligence {
  const relevanceScore = calculateRelevanceScore(item);
  
  let type: PoliticalIntelligence['type'] = 'routine';
  let urgency: PoliticalIntelligence['urgency'] = 'low';
  let impact: PoliticalIntelligence['impact'] = 'procedural';
  let drama: PoliticalIntelligence['drama'] = 'low';

  // Determine type
  if (relevanceScore.score >= 80) type = 'breaking';
  else if (relevanceScore.score >= 60) type = 'background';
  else if (relevanceScore.score >= 40) type = 'sleeper';
  else type = 'routine';

  // Determine urgency
  if (relevanceScore.factors.urgency >= 80) urgency = 'critical';
  else if (relevanceScore.factors.urgency >= 60) urgency = 'high';
  else if (relevanceScore.factors.urgency >= 40) urgency = 'medium';
  else urgency = 'low';

  // Determine impact
  if (relevanceScore.factors.impact >= 80) impact = 'national';
  else if (relevanceScore.factors.impact >= 60) impact = 'regional';
  else if (relevanceScore.factors.impact >= 40) impact = 'committee';
  else impact = 'procedural';

  // Determine drama
  if (relevanceScore.factors.politicalDrama >= 80) drama = 'high';
  else if (relevanceScore.factors.politicalDrama >= 60) drama = 'medium';
  else drama = 'low';

  const predictions: string[] = [];
  const context: string[] = [];
  const relatedIssues: string[] = [];

  // Generate predictions based on item type
  if (item.billType) {
    const bill = item;
    
    if (bill.cosponsors.length > 10) {
      predictions.push('Likely to pass with bipartisan support');
    }
    
    if (bill.actions.length > 5) {
      predictions.push('High activity suggests urgency or controversy');
    }
    
    context.push(`Introduced by ${bill.sponsor.fullName} (${bill.sponsor.party}-${bill.sponsor.state})`);
    
    bill.subjects.forEach((subject: string) => {
      relatedIssues.push(subject);
    });
  }

  if (item.witnesses) {
    const hearing = item;
    
    if (hearing.witnesses.length > 8) {
      predictions.push('Extended witness list suggests complex or controversial topic');
    }
    
    context.push(`Committee: ${hearing.committeeName}`);
    
    hearing.bills.forEach((bill: any) => {
      relatedIssues.push(bill.title);
    });
  }

  return {
    type,
    urgency,
    impact,
    drama,
    predictions,
    context: context.join('. '),
    relatedIssues: [...new Set(relatedIssues)],
  };
}

// ============================================================================
// LEGISLATIVE JOURNEY TRACKING
// ============================================================================

function trackLegislativeJourney(bill: any): LegislativeJourney {
  const timeline: LegislativeJourney['timeline'] = [];
  let stage: 'introduced' | 'committee' | 'floor' | 'conference' | 'enacted' | 'vetoed' = 'introduced';
  let progress = 0;
  let momentum: LegislativeJourney['momentum'] = 'steady';
  const nextSteps: string[] = [];
  const roadblocks: string[] = [];

  // Analyze actions to determine stage and progress
  bill.actions.forEach((action: any) => {
    const significance = action.text.toLowerCase().includes('passed') || 
                        action.text.toLowerCase().includes('enacted') ? 'major' :
                        action.text.toLowerCase().includes('introduced') ? 'major' : 'minor';
    
    timeline.push({
      date: action.actionDate,
      action: action.text,
      significance,
    });

    // Determine stage based on actions
    if (action.text.toLowerCase().includes('enacted')) {
      stage = 'enacted';
      progress = 100;
    } else if (action.text.toLowerCase().includes('passed house') && action.text.toLowerCase().includes('passed senate')) {
      stage = 'conference';
      progress = 85;
    } else if (action.text.toLowerCase().includes('passed house') || action.text.toLowerCase().includes('passed senate')) {
      stage = 'floor';
      progress = 70;
    } else if (action.text.toLowerCase().includes('reported') || action.text.toLowerCase().includes('ordered reported')) {
      stage = 'committee';
      progress = 40;
    }
  });

  // Determine momentum based on recent activity
  const recentActions = bill.actions.filter((action: any) => {
    const actionDate = new Date(action.actionDate);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return actionDate > thirtyDaysAgo;
  });

  if (recentActions.length > 5) {
    momentum = 'accelerating';
  } else if (recentActions.length === 0) {
    momentum = 'stalled';
  } else if (recentActions.length > 2) {
    momentum = 'steady';
  } else {
    momentum = 'slowing';
  }

  // Generate next steps based on current stage
  switch (stage as LegislativeJourney['stage']) {
    case 'introduced':
      nextSteps.push('Committee referral and initial review');
      nextSteps.push('Potential subcommittee hearing');
      break;
    case 'committee':
      nextSteps.push('Full committee markup');
      nextSteps.push('Committee vote on passage');
      break;
    case 'floor':
      nextSteps.push('Floor debate and amendments');
      nextSteps.push('Final passage vote');
      break;
    case 'conference':
      nextSteps.push('Conference committee negotiations');
      nextSteps.push('Final conference report');
      break;
    case 'enacted':
      nextSteps.push('Implementation and oversight');
      break;
    case 'vetoed':
      nextSteps.push('Potential veto override attempt');
      break;
  }

  // Identify potential roadblocks
  if (bill.cosponsors.length < 10) {
    roadblocks.push('Limited cosponsor support');
  }

  return {
    stage,
    progress,
    timeline,
    nextSteps,
    roadblocks,
    momentum,
  };
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as PoliticalIntelligenceRequest['type'] || 'weekly-briefing';
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '10');

    let response: any = {};

    switch (type) {
      case 'weekly-briefing':
        // Critical deadlines (approaching votes, expiring bills, etc.)
        const criticalDeadlines = mockHighImpactBills
          .filter(bill => {
            const daysSinceIntroduced = Math.floor((Date.now() - new Date(bill.introducedDate).getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceIntroduced > 300; // Bills over 10 months old
          })
          .slice(0, 5)
          .map(bill => ({
            item: bill,
            deadline: 'Session end',
            reason: 'Bill will expire if not passed by end of Congress',
          }));

        // High-impact votes (close votes, final passage, etc.)
        const highImpactVotes = mockHighImpactVotes
          .filter(vote => {
            const totalVotes = vote.voteCounts.yes + vote.voteCounts.no;
            const margin = Math.abs(vote.voteCounts.yes - vote.voteCounts.no);
            return margin / totalVotes < 0.2; // Votes with less than 20% margin
          })
          .slice(0, 5);

        // Controversial hearings
        const controversialHearings = mockHighImpactHearings
          .filter(hearing => {
            const controversialTopics = ['oversight', 'investigation', 'contempt', 'impeachment', 'ethics'];
            return controversialTopics.some(topic => hearing.title.toLowerCase().includes(topic));
          })
          .slice(0, 5);

        // Bipartisan bills
        const bipartisanBills = mockHighImpactBills
          .filter(bill => bill.cosponsors.length > 3)
          .slice(0, 5);

        // Political drama
        const politicalDrama = [
          ...mockHighImpactVotes
            .filter(vote => vote.voteCounts.yes === vote.voteCounts.no)
            .map(vote => ({
              item: vote,
              drama: 'Tie vote',
              context: 'Requires Speaker or Vice President to break tie',
            })),
          ...mockHighImpactHearings
            .filter(hearing => hearing.witnesses.length > 8)
            .map(hearing => ({
              item: hearing,
              drama: 'High-profile witness list',
              context: 'Multiple witnesses suggest complex or controversial topic',
            })),
        ].slice(0, 5);

        response = {
          criticalDeadlines,
          highImpactVotes,
          controversialHearings,
          bipartisanBills,
          politicalDrama,
        };
        break;

      case 'high-impact':
        // Get high-impact bills with relevance scoring
        const highImpactBillsWithScores = mockHighImpactBills
          .map(bill => ({
            ...bill,
            relevanceScore: calculateRelevanceScore(bill),
            intelligence: generatePoliticalIntelligence(bill),
            journey: trackLegislativeJourney(bill),
          }))
          .filter(bill => bill.relevanceScore.score >= 60)
          .sort((a, b) => b.relevanceScore.score - a.relevanceScore.score)
          .slice(0, limit);

        // Get high-impact hearings with relevance scoring
        const highImpactHearingsWithScores = mockHighImpactHearings
          .map(hearing => ({
            ...hearing,
            relevanceScore: calculateRelevanceScore(hearing),
            intelligence: generatePoliticalIntelligence(hearing),
          }))
          .filter(hearing => hearing.relevanceScore.score >= 60)
          .sort((a, b) => b.relevanceScore.score - a.relevanceScore.score)
          .slice(0, limit);

        response = {
          bills: highImpactBillsWithScores,
          hearings: highImpactHearingsWithScores,
          votes: mockHighImpactVotes,
        };
        break;

      case 'representative-activity':
        if (!state) {
          return NextResponse.json(
            { success: false, error: 'State parameter is required for representative activity' },
            { status: 400 }
          );
        }

        // Mock representative activity data
        response = {
          state,
          district,
          representatives: [
            {
              name: 'Rep. John Smith',
              party: 'D',
              state,
              district: district || '1',
              recentActivity: [
                {
                  type: 'sponsored',
                  item: mockHighImpactBills[0],
                  date: '2024-01-15',
                },
                {
                  type: 'cosponsored',
                  item: mockHighImpactBills[1],
                  date: '2024-01-20',
                },
              ],
            },
          ],
        };
        break;

      case 'legislative-journey':
        const billId = searchParams.get('billId');
        if (!billId) {
          return NextResponse.json(
            { success: false, error: 'billId parameter is required for legislative journey' },
            { status: 400 }
          );
        }

        const bill = mockHighImpactBills.find(b => b.id === billId);
        if (!bill) {
          return NextResponse.json(
            { success: false, error: 'Bill not found' },
            { status: 404 }
          );
        }

        response = {
          bill,
          journey: trackLegislativeJourney(bill),
          relevanceScore: calculateRelevanceScore(bill),
          intelligence: generatePoliticalIntelligence(bill),
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: response,
      type,
      timestamp: new Date().toISOString(),
      source: 'political-intelligence-api',
    });

  } catch (error) {
    console.error('Political intelligence API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate political intelligence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 