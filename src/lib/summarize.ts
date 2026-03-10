// Load environment variables from .env.local file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';

// TypeScript types for better type safety
export interface SummaryOptions {
  tone?: 'objective' | 'factual' | 'precise';
  focus?: 'key_points' | 'decisions' | 'overview';
  maxSentences?: number;
}

export interface SummaryResult {
  summary: string;
  wordCount: number;
  keyTopics: string[];
}

export interface BillInfo {
  billNumber?: string;
  billTitle?: string;
  sponsor?: {
    name?: string;
    party?: string;
    state?: string;
    chamber?: string;
  };
  cosponsors?: Array<{
    name?: string;
    party?: string;
    state?: string;
  }>;
  status?: string;
  introducedDate?: string;
  lastAction?: string;
}

export interface CongressionalAnalysis {
  summary: string;
  billInfo?: BillInfo;
  keySpeakers: Array<{
    name: string;
    role: string;
    party?: string;
    state?: string;
    keyStatements?: string[];
  }>;
  keyTopics: string[];
  decisions: string[];
  actions: string[];
  context: {
    chamber: string;
    committee?: string;
    date: string;
    session: string;
    type: 'hearing' | 'floor' | 'markup' | 'nomination' | 'other';
  };
  relatedBills?: string[];
  amendments?: string[];
  votes?: Array<{
    description: string;
    result: string;
    yeas: number;
    nays: number;
  }>;
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Enhanced analysis that extracts bills, sponsors, and contextual information
 * @param transcript - The transcript text to analyze
 * @returns Promise<CongressionalAnalysis> - Detailed analysis with structured data
 */
export async function analyzeCongressionalContent(
  transcript: string
): Promise<CongressionalAnalysis> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript text provided');
    }

    const maxTranscriptLength = 100000;
    const truncatedTranscript = transcript.length > maxTranscriptLength 
      ? transcript.substring(0, maxTranscriptLength) + '...'
      : transcript;

    const prompt = `Analyze this congressional transcript and extract structured information. Return your response as a JSON object with the following structure:

{
  "summary": "2-3 sentence summary of what happened",
  "billInfo": {
    "billNumber": "e.g., H.R. 1234, S. 567",
    "billTitle": "Full title of the bill",
    "sponsor": {
      "name": "Sponsor's full name",
      "party": "D/R/I",
      "state": "State abbreviation",
      "chamber": "House/Senate"
    },
    "cosponsors": [
      {
        "name": "Cosponsor name",
        "party": "D/R/I",
        "state": "State abbreviation"
      }
    ],
    "status": "Current status of the bill",
    "introducedDate": "Date introduced",
    "lastAction": "Most recent action"
  },
  "keySpeakers": [
    {
      "name": "Speaker's full name",
      "role": "e.g., Senator, Representative, Witness, Chair",
      "party": "D/R/I if mentioned",
      "state": "State if mentioned",
      "keyStatements": ["Key quotes or statements made"]
    }
  ],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "decisions": ["Any decisions made or announced"],
  "actions": ["Actions taken or announced"],
  "context": {
    "chamber": "House/Senate",
    "committee": "Committee name if applicable",
    "date": "Date of the proceeding",
    "session": "Congress session (e.g., 119th Congress, 1st Session)",
    "type": "hearing/floor/markup/nomination/other"
  },
  "relatedBills": ["Related bill numbers mentioned"],
  "amendments": ["Amendment numbers or descriptions"],
  "votes": [
    {
      "description": "What was voted on",
      "result": "Passed/Failed",
      "yeas": 0,
      "nays": 0
    }
  ]
}

Focus on factual information that can be directly extracted from the transcript. If information is not available, use null or omit the field. Be precise with bill numbers, names, and dates.

Transcript:
${truncatedTranscript}

JSON Response:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = message.content[0];
    
    if (response.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    const responseText = response.text;
    console.log('🔍 Enhanced analysis response:', responseText.substring(0, 500) + '...');

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const analysis: CongressionalAnalysis = JSON.parse(jsonMatch[0]);

    // Validate and clean up the analysis
    if (!analysis.summary) {
      analysis.summary = 'No summary available';
    }

    if (!analysis.keyTopics || !Array.isArray(analysis.keyTopics)) {
      analysis.keyTopics = [];
    }

    if (!analysis.keySpeakers || !Array.isArray(analysis.keySpeakers)) {
      analysis.keySpeakers = [];
    }

    if (!analysis.decisions || !Array.isArray(analysis.decisions)) {
      analysis.decisions = [];
    }

    if (!analysis.actions || !Array.isArray(analysis.actions)) {
      analysis.actions = [];
    }

    if (!analysis.context) {
      analysis.context = {
        chamber: 'Unknown',
        date: 'Unknown',
        session: 'Unknown',
        type: 'other'
      };
    }

    console.log('✅ Enhanced analysis completed');
    console.log('📋 Bill Info:', analysis.billInfo ? 'Found' : 'None');
    console.log('👥 Key Speakers:', analysis.keySpeakers.length);
    console.log('📝 Key Topics:', analysis.keyTopics.length);

    return analysis;

  } catch (error) {
    console.error('Enhanced analysis error:', error);
    
    // Return a basic analysis if the enhanced one fails
    return {
      summary: 'Analysis failed - using basic summary',
      keySpeakers: [],
      keyTopics: [],
      decisions: [],
      actions: [],
      context: {
        chamber: 'Unknown',
        date: 'Unknown',
        session: 'Unknown',
        type: 'other'
      }
    };
  }
}

/**
 * Creates a 2-3 sentence summary of a transcript following strict journalistic accuracy
 * @param transcript - The transcript text to summarize
 * @param options - Optional parameters for customization
 * @returns Promise<SummaryResult> - The summary and metadata
 * @throws Error - If summarization fails or API key is missing
 * 
 * @example
 * ```typescript
 * const transcript = "Long transcript text about government proceeding...";
 * try {
 *   const result = await summarizeForYoungVoters(transcript);
 *   console.log('Summary:', result.summary);
 * } catch (error) {
 *   console.error('Summarization failed:', error.message);
 * }
 * ```
 */
export async function summarizeForYoungVoters(
  transcript: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: SummaryOptions = {}
): Promise<SummaryResult> {
  try {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Validate transcript
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript text provided');
    }

    // Truncate transcript if it's too long (Claude has token limits)
    const maxTranscriptLength = 100000; // Conservative limit
    const truncatedTranscript = transcript.length > maxTranscriptLength 
      ? transcript.substring(0, maxTranscriptLength) + '...'
      : transcript;

    // Create the accuracy-focused prompt for Claude
    const prompt = `Summarize this transcript in 2-3 sentences for young voters. Focus on what was actually said by the speakers. Be objective and factual.

Transcript:
${truncatedTranscript}

Provide your summary:`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.0, // Zero temperature for maximum factual accuracy
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = message.content[0];
    
    if (response.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    const responseText = response.text;
    console.log('🔍 Claude response:', responseText.substring(0, 500) + '...');

    // Parse the response - be very flexible
    let summary = responseText.trim();
    
    // Remove any markdown formatting
    summary = summary.replace(/^#+\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
    
    // If it's too long, take just the first few sentences
    const sentences = summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    if (sentences.length > 3) {
      summary = sentences.slice(0, 3).join('. ') + '.';
    }
    
    // Extract topics from the summary (simple keyword extraction)
    const commonTopics = ['budget', 'healthcare', 'immigration', 'taxes', 'education', 'defense', 'foreign policy', 'economy', 'jobs', 'climate', 'energy', 'voting', 'elections'];
    const keyTopics = commonTopics.filter(topic => 
      summary.toLowerCase().includes(topic)
    ).slice(0, 5);

    console.log('✅ Parsed summary:', summary.substring(0, 200) + '...');
    console.log('✅ Extracted topics:', keyTopics);

    return {
      summary,
      wordCount: summary.split(/\s+/).length,
      keyTopics
    };

  } catch (error) {
    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      switch ((error as any).status) {
        case 401:
          throw new Error('Invalid Anthropic API key');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 400:
          throw new Error('Invalid request to Claude API');
        case 500:
          throw new Error('Claude API server error. Please try again.');
        default:
          throw new Error(`Anthropic API error: ${(error as any).message}`);
      }
    }

    // Re-throw other errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle unknown errors
    throw new Error('An unexpected error occurred during summarization');
  }
}

/**
 * Creates a summary focused on decisions and actions mentioned by speakers
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeDecisions(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'factual',
    focus: 'decisions',
    maxSentences: 3
  });
}

/**
 * Creates a summary focused on key speakers and topics they addressed
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeKeyPoints(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'factual',
    focus: 'key_points',
    maxSentences: 3
  });
}

/**
 * Creates a brief overview of what was discussed
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeOverview(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'factual',
    focus: 'overview',
    maxSentences: 2
  });
} 