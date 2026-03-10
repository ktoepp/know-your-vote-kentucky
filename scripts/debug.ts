import { fetchVideos, fetchSpeakers, fetchTopics } from '../src/api';
import { createVideoCollection, createSpeakerCollection, createTopicCollection } from '../src/collections';
import { logger } from '../src/utils/logger';
import { validateVideos, validateSpeakers, validateTopics } from '../src/utils/validator';
import { normalizeVideo, normalizeSpeaker, normalizeTopic } from '../src/utils/transform';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('test-config.json', 'utf-8'));
const API_BASE = process.env.API_URL || config.mockApiEndpoint;
const API_KEY = process.env.API_KEY || '';

async function main() {
  try {
    logger.info('Testing API connection for videos...');
    const videos = await fetchVideos(API_BASE, API_KEY);
    logger.info(`Fetched ${videos.length} videos.`);
    const videoErrors = validateVideos(videos);
    if (videoErrors.length) {
      videoErrors.forEach(e => logger.error(e));
      throw new Error('Video data validation failed');
    }
    const normalizedVideos = videos.map(normalizeVideo);
    logger.info('Videos normalized:', normalizedVideos);

    logger.info('Testing API connection for speakers...');
    const speakers = await fetchSpeakers(API_BASE, API_KEY);
    logger.info(`Fetched ${speakers.length} speakers.`);
    const speakerErrors = validateSpeakers(speakers);
    if (speakerErrors.length) {
      speakerErrors.forEach(e => logger.error(e));
      throw new Error('Speaker data validation failed');
    }
    const normalizedSpeakers = speakers.map(normalizeSpeaker);
    logger.info('Speakers normalized:', normalizedSpeakers);

    logger.info('Testing API connection for topics...');
    const topics = await fetchTopics(API_BASE, API_KEY);
    logger.info(`Fetched ${topics.length} topics.`);
    const topicErrors = validateTopics(topics);
    if (topicErrors.length) {
      topicErrors.forEach(e => logger.error(e));
      throw new Error('Topic data validation failed');
    }
    const normalizedTopics = topics.map(normalizeTopic);
    logger.info('Topics normalized:', normalizedTopics);

    // Mock collection creation
    logger.info('Testing collection creation...');
    const videoCol = createVideoCollection();
    const speakerCol = createSpeakerCollection();
    const topicCol = createTopicCollection();
    
    // Check if required fields exist in the fields array
    const hasVideoTitle = videoCol.fields.some(field => field.name === 'title');
    const hasSpeakerName = speakerCol.fields.some(field => field.name === 'name');
    const hasTopicName = topicCol.fields.some(field => field.name === 'name');
    
    if (!hasVideoTitle || !hasSpeakerName || !hasTopicName) {
      throw new Error('Collection schema missing required fields');
    }
    logger.info('Collection schemas validated.');

    logger.info('All tests passed!');
    process.exit(0);
  } catch (err: any) {
    logger.error('Debug script failed:', err?.message || err);
    process.exit(1);
  }
}

main(); 