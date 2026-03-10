// Load environment variables from .env.local file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// WARNING: This file must only be imported in server code or API routes. Do not import in client components.

// TypeScript types for better type safety
export interface SummaryOptions {
  tone?: 'engaging' | 'educational' | 'conversational';
  focus?: 'key_points' | 'action_items' | 'overview';
  maxSentences?: number;
}

export interface SummaryResult {
  summary: string;
  wordCount: number;
  keyTopics: string[];
}

/**
 * Creates a 2-3 sentence summary of a transcript suitable for young voters
 * @param transcript - The transcript text to summarize
 * @param options - Optional parameters for customization
 * @returns Promise<SummaryResult> - The summary and metadata
 * @throws Error - If summarization fails or API key is missing
 * 
 * @example
 * ```typescript
 * const transcript = "Long transcript text about government policy...";
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
  options: SummaryOptions = {}
): Promise<SummaryResult> {
  // Import Anthropic SDK only when this function is called (server-side)
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

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

    const maxSentences = options.maxSentences || 3;
    const tone = options.tone || 'engaging';
    const focus = options.focus || 'key_points';

    // Create the prompt for Claude
    const prompt = `You are an expert educator helping young voters (ages 18-25) understand government and politics. 

Please create a ${maxSentences}-sentence summary of the following transcript that is:
- Engaging and easy to understand for young voters
- Factual and unbiased (present multiple perspectives when relevant)
- Educational and informative about government processes or policies
- Written in a ${tone} tone
- Focused on ${focus === 'key_points' ? 'the most important points' : focus === 'action_items' ? 'what actions or changes are being discussed' : 'providing a clear overview'}

Transcript:
${truncatedTranscript}

Please provide your response in this exact format:
SUMMARY: [Your 2-3 sentence summary here]
KEY_TOPICS: [Comma-separated list of 3-5 key topics discussed]

Remember: Keep it factual, engaging, and suitable for young voters who are learning about government.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent, factual output
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

    // Parse the response to extract summary and key topics
    const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=\n|$)/s);
    const topicsMatch = responseText.match(/KEY_TOPICS:\s*(.+?)(?=\n|$)/s);

    if (!summaryMatch) {
      throw new Error('Could not extract summary from Claude response');
    }

    const summary = summaryMatch[1].trim();
    const keyTopics = topicsMatch 
      ? topicsMatch[1].split(',').map(topic => topic.trim()).filter(topic => topic.length > 0)
      : [];

    return {
      summary,
      wordCount: summary.split(/\s+/).length,
      keyTopics
    };

  } catch (error) {
    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      switch (error.status) {
        case 401:
          throw new Error('Invalid Anthropic API key');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 400:
          throw new Error('Invalid request to Claude API');
        case 500:
          throw new Error('Claude API server error. Please try again.');
        default:
          throw new Error(`Anthropic API error: ${error.message}`);
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
 * Creates a summary with specific focus on government and civic engagement
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeGovernmentContent(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'educational',
    focus: 'key_points',
    maxSentences: 3
  });
}

/**
 * Creates a summary focused on action items and next steps
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeWithActionItems(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'engaging',
    focus: 'action_items',
    maxSentences: 3
  });
}

/**
 * Creates a conversational summary for social media sharing
 * @param transcript - The transcript text to summarize
 * @returns Promise<SummaryResult> - The summary and metadata
 */
export async function summarizeForSocialMedia(transcript: string): Promise<SummaryResult> {
  return summarizeForYoungVoters(transcript, {
    tone: 'conversational',
    focus: 'overview',
    maxSentences: 2
  });
}
