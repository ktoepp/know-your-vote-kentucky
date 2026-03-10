// Load environment variables from .env.local file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes a video file using OpenAI's Whisper API
 * @param file - The video file to transcribe
 * @returns Promise<string> - The transcribed text
 * @throws Error - If transcription fails or API key is missing
 */
export async function transcribeVideo(file: File): Promise<string> {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (Whisper API has a 25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 25MB limit for Whisper API`);
    }

    // Validate file type
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      throw new Error(`Invalid file type: ${file.type}. Only video and audio files are supported.`);
    }

    console.log(`[Transcribe] Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Call OpenAI Whisper API with proper file handling
    const transcription = await openai.audio.transcriptions.create({
      file: file, // Pass the File object directly
      model: 'whisper-1',
    });

    console.log(`[Transcribe] Successfully transcribed ${file.name}`);
    return transcription.text;

  } catch (error) {
    console.error('[Transcribe] Error during transcription:', error);
    
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      switch ((error as any).status) {
        case 400:
          if ((error as any).message.includes('file')) {
            throw new Error('Invalid file format. Please ensure the file is a valid video or audio file.');
          }
          throw new Error(`Bad request: ${(error as any).message}`);
        case 401:
          throw new Error('Invalid OpenAI API key');
        case 413:
          throw new Error('File too large for transcription (max 25MB)');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('OpenAI server error. Please try again.');
        default:
          throw new Error(`OpenAI API error (${(error as any).status}): ${(error as any).message}`);
      }
    }

    // Handle file size errors
    if (error instanceof Error && error.message.includes('25MB')) {
      throw error; // Re-throw file size errors as-is
    }

    // Re-throw other errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle unknown errors
    throw new Error('An unexpected error occurred during transcription');
  }
}

/**
 * Transcribes a video file with additional options
 * @param file - The video file to transcribe
 * @param options - Optional transcription parameters
 * @returns Promise<string> - The transcribed text
 */
export async function transcribeVideoWithOptions(
  file: File,
  options: {
    language?: string;
    prompt?: string;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    temperature?: number;
  } = {}
): Promise<string> {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (Whisper API has a 25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 25MB limit for Whisper API`);
    }

    // Validate file type
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      throw new Error(`Invalid file type: ${file.type}. Only video and audio files are supported.`);
    }

    console.log(`[Transcribe] Processing file with options: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Call OpenAI Whisper API with options
    const transcription = await openai.audio.transcriptions.create({
      file: file, // Pass the File object directly
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: options.responseFormat || 'text',
      temperature: options.temperature,
    });

    console.log(`[Transcribe] Successfully transcribed ${file.name} with options`);
    return transcription.text;

  } catch (error) {
    console.error('[Transcribe] Error during transcription with options:', error);
    
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      switch ((error as any).status) {
        case 400:
          if ((error as any).message.includes('file')) {
            throw new Error('Invalid file format. Please ensure the file is a valid video or audio file.');
          }
          throw new Error(`Bad request: ${(error as any).message}`);
        case 401:
          throw new Error('Invalid OpenAI API key');
        case 413:
          throw new Error('File too large for transcription (max 25MB)');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('OpenAI server error. Please try again.');
        default:
          throw new Error(`OpenAI API error (${(error as any).status}): ${(error as any).message}`);
      }
    }

    // Handle file size errors
    if (error instanceof Error && error.message.includes('25MB')) {
      throw error; // Re-throw file size errors as-is
    }

    // Re-throw other errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle unknown errors
    throw new Error('An unexpected error occurred during transcription');
  }
} 