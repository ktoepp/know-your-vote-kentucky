// Load environment variables from .env.local file
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';

// TypeScript types for better type safety
export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribes a video file using OpenAI's Whisper API
 * @param file - The video file to transcribe
 * @returns Promise<string> - The transcribed text
 * @throws Error - If transcription fails or API key is missing
 * 
 * @example
 * ```typescript
 * const fileInput = document.getElementById('file-input') as HTMLInputElement;
 * const file = fileInput.files?.[0];
 * 
 * if (file) {
 *   try {
 *     const transcript = await transcribeVideo(file);
 *     console.log('Transcript:', transcript);
 *   } catch (error) {
 *     console.error('Transcription failed:', error.message);
 *   }
 * }
 * ```
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
      throw new Error('File size exceeds 25MB limit for Whisper API');
    }

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: file.type }), file.name);
    formData.append('model', 'whisper-1');

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: new Blob([buffer], { type: file.type }),
      model: 'whisper-1',
    });

    return transcription.text;
  } catch (error) {
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          throw new Error('Invalid OpenAI API key');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 413:
          throw new Error('File too large for transcription');
        default:
          throw new Error(`OpenAI API error: ${error.message}`);
      }
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
 * 
 * @example
 * ```typescript
 * const transcript = await transcribeVideoWithOptions(file, {
 *   language: 'en',
 *   prompt: 'This is a technical presentation about AI',
 *   responseFormat: 'text',
 *   temperature: 0.3
 * });
 * ```
 */
export async function transcribeVideoWithOptions(
  file: File,
  options: TranscriptionOptions = {}
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
      throw new Error('File size exceeds 25MB limit for Whisper API');
    }

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call OpenAI Whisper API with options
    const transcription = await openai.audio.transcriptions.create({
      file: new Blob([buffer], { type: file.type }),
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: options.responseFormat || 'text',
      temperature: options.temperature,
    });

    return transcription.text;
  } catch (error) {
    // Handle specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          throw new Error('Invalid OpenAI API key');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 413:
          throw new Error('File too large for transcription');
        default:
          throw new Error(`OpenAI API error: ${error.message}`);
      }
    }

    // Re-throw other errors
    if (error instanceof Error) {
      throw error;
    }

    // Handle unknown errors
    throw new Error('An unexpected error occurred during transcription');
  }
}
