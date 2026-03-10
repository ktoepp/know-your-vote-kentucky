// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GraphDatabase, Video, Speaker, Topic, Bill, Event, Node } from './graph-database';

/**
 * Query functions for the graph database
 * Provides high-level analysis and relationship discovery
 */

export interface RelatedVideo {
  video: Video;
  connectionType: 'speaker' | 'topic' | 'bill';
  connectionDetails: {
    speakers?: string[];
    topics?: string[];
    bills?: string[];
  };
  similarityScore: number;
}

export interface SpeakerHistory {
  speaker: Speaker;
  videos: Video[];
  totalAppearances: number;
  topics: Topic[];
  bills: Bill[];
  events: Event[];
  timeline: {
    date: string;
    videoId: string;
    eventType?: string;
  }[];
}

export interface BillTracking {
  bill: Bill;
  videos: Video[];
  speakers: Speaker[];
  topics: Topic[];
  timeline: {
    date: string;
    videoId: string;
    eventType?: string;
    speakerName?: string;
  }[];
  mentionCount: number;
}

export interface TopicTimeline {
  topic: Topic;
  videos: Video[];
  speakers: Speaker[];
  timeline: {
    date: string;
    videoId: string;
    eventType?: string;
    speakerName?: string;
    context?: string;
  }[];
  discussionCount: number;
}

export interface VideoConnections {
  video: Video;
  speakers: Speaker[];
  topics: Topic[];
  bills: Bill[];
  events: Event[];
  relatedVideos: RelatedVideo[];
  connectionSummary: {
    totalSpeakers: number;
    totalTopics: number;
    totalBills: number;
    totalEvents: number;
    totalRelatedVideos: number;
  };
}

/**
 * Find videos related to a given video through shared speakers, topics, or bills
 */
export function findRelatedVideos(
  db: GraphDatabase, 
  videoId: string, 
  limit: number = 10
): RelatedVideo[] {
  const relatedVideos: Map<string, RelatedVideo> = new Map();
  
  // Get the source video
  const sourceVideo = db.getNode(videoId) as Video;
  if (!sourceVideo || sourceVideo.type !== 'Video') {
    throw new Error(`Video with id ${videoId} not found`);
  }

  // Find videos with same speakers
  const sourceSpeakers = db.findSpeakersByVideo(videoId);
  for (const speaker of sourceSpeakers) {
    const speakerVideos = db.findVideosBySpeaker(speaker.id);
    for (const video of speakerVideos) {
      if (video.id === videoId) continue; // Skip the source video
      
      const existing = relatedVideos.get(video.id);
      if (existing) {
        existing.connectionDetails.speakers = existing.connectionDetails.speakers || [];
        existing.connectionDetails.speakers.push(speaker.name);
        existing.similarityScore += 2; // Speaker connections are weighted higher
      } else {
        relatedVideos.set(video.id, {
          video,
          connectionType: 'speaker',
          connectionDetails: { speakers: [speaker.name] },
          similarityScore: 2
        });
      }
    }
  }

  // Find videos with same topics
  const sourceTopics = db.findTopicsByVideo(videoId);
  for (const topic of sourceTopics) {
    const topicVideos = db.findVideosByTopic(topic.id);
    for (const video of topicVideos) {
      if (video.id === videoId) continue;
      
      const existing = relatedVideos.get(video.id);
      if (existing) {
        existing.connectionDetails.topics = existing.connectionDetails.topics || [];
        existing.connectionDetails.topics.push(topic.subject);
        existing.similarityScore += 1;
      } else {
        relatedVideos.set(video.id, {
          video,
          connectionType: 'topic',
          connectionDetails: { topics: [topic.subject] },
          similarityScore: 1
        });
      }
    }
  }

  // Find videos with same bills
  const sourceBills = db.findBillsByVideo(videoId);
  for (const bill of sourceBills) {
    const billVideos = db.getConnectedNodes(bill.id, 'REFERENCES', 'incoming')
      .map(({ node }) => node)
      .filter((node): node is Video => node.type === 'Video');
    
    for (const video of billVideos) {
      if (video.id === videoId) continue;
      
      const existing = relatedVideos.get(video.id);
      if (existing) {
        existing.connectionDetails.bills = existing.connectionDetails.bills || [];
        existing.connectionDetails.bills.push(bill.billNumber);
        existing.similarityScore += 1.5;
      } else {
        relatedVideos.set(video.id, {
          video,
          connectionType: 'bill',
          connectionDetails: { bills: [bill.billNumber] },
          similarityScore: 1.5
        });
      }
    }
  }

  // Sort by similarity score and return top results
  return Array.from(relatedVideos.values())
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * Get complete history of a speaker across all videos
 */
export function getSpeakerHistory(
  db: GraphDatabase, 
  speakerName: string
): SpeakerHistory | null {
  // Find the speaker by name
  const speakers = db.searchNodes(speakerName, 'Speaker');
  const speaker = speakers.find(s => s.type === 'Speaker' && s.name.toLowerCase().includes(speakerName.toLowerCase())) as Speaker;
  
  if (!speaker) {
    return null;
  }

  // Get all videos featuring this speaker
  const videos = db.findVideosBySpeaker(speaker.id);
  
  // Get topics the speaker has spoken about
  const topics = db.getConnectedNodes(speaker.id, 'SPEAKS_ON')
    .map(({ node }) => node)
    .filter((node): node is Topic => node.type === 'Topic');
  
  // Get bills the speaker has sponsored
  const bills = db.getConnectedNodes(speaker.id, 'SPONSORS')
    .map(({ node }) => node)
    .filter((node): node is Bill => node.type === 'Bill');
  
  // Get events the speaker has attended
  const events = db.getConnectedNodes(speaker.id, 'ATTENDS')
    .map(({ node }) => node)
    .filter((node): node is Event => node.type === 'Event');
  
  // Create timeline
  const timeline = videos.map(video => ({
    date: video.metadata.date,
    videoId: video.id,
    eventType: video.metadata.eventType
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    speaker,
    videos,
    totalAppearances: videos.length,
    topics,
    bills,
    events,
    timeline
  };
}

/**
 * Track mentions of a specific bill across all videos
 */
export function trackBillMentions(
  db: GraphDatabase, 
  billNumber: string
): BillTracking | null {
  // Find the bill by number
  const bills = db.searchNodes(billNumber, 'Bill');
  const bill = bills.find(b => b.type === 'Bill' && b.billNumber.includes(billNumber)) as Bill;
  
  if (!bill) {
    return null;
  }

  // Get all videos that reference this bill
  const videos = db.getConnectedNodes(bill.id, 'REFERENCES', 'incoming')
    .map(({ node }) => node)
    .filter((node): node is Video => node.type === 'Video');
  
  // Get speakers who have discussed this bill
  const speakers = db.getConnectedNodes(bill.id, 'SPONSORS', 'incoming')
    .map(({ node }) => node)
    .filter((node): node is Speaker => node.type === 'Speaker');
  
  // Get topics related to this bill
  const topics = db.getConnectedNodes(bill.id, 'IMPACTS')
    .map(({ node }) => node)
    .filter((node): node is Topic => node.type === 'Topic');
  
  // Create timeline with speaker information
  const timeline = videos.map(video => {
    const videoSpeakers = db.findSpeakersByVideo(video.id);
    return {
      date: video.metadata.date,
      videoId: video.id,
      eventType: video.metadata.eventType,
      speakerName: videoSpeakers.length > 0 ? videoSpeakers[0].name : undefined
    };
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    bill,
    videos,
    speakers,
    topics,
    timeline,
    mentionCount: videos.length
  };
}

/**
 * Get chronological timeline of discussions about a specific topic
 */
export function getTopicTimeline(
  db: GraphDatabase, 
  topicSubject: string
): TopicTimeline | null {
  // Find the topic by subject
  const topics = db.searchNodes(topicSubject, 'Topic');
  const topic = topics.find(t => t.type === 'Topic' && t.subject.toLowerCase().includes(topicSubject.toLowerCase())) as Topic;
  
  if (!topic) {
    return null;
  }

  // Get all videos that discuss this topic
  const videos = db.findVideosByTopic(topic.id);
  
  // Get speakers who have spoken about this topic
  const speakers = db.findSpeakersByTopic(topic.id);
  
  // Create detailed timeline
  const timeline = videos.map(video => {
    const videoSpeakers = db.findSpeakersByVideo(video.id);
    return {
      date: video.metadata.date,
      videoId: video.id,
      eventType: video.metadata.eventType,
      speakerName: videoSpeakers.length > 0 ? videoSpeakers[0].name : undefined,
      context: video.metadata.title
    };
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    topic,
    videos,
    speakers,
    timeline,
    discussionCount: videos.length
  };
}

/**
 * Get all connections for a specific video
 */
export function getVideoConnections(
  db: GraphDatabase, 
  videoId: string
): VideoConnections | null {
  // Get the video
  const video = db.getNode(videoId) as Video;
  if (!video || video.type !== 'Video') {
    return null;
  }

  // Get all connected entities
  const speakers = db.findSpeakersByVideo(videoId);
  const topics = db.findTopicsByVideo(videoId);
  const bills = db.findBillsByVideo(videoId);
  const events = db.findEventsByVideo(videoId);
  
  // Get related videos
  const relatedVideos = findRelatedVideos(db, videoId, 5);

  return {
    video,
    speakers,
    topics,
    bills,
    events,
    relatedVideos,
    connectionSummary: {
      totalSpeakers: speakers.length,
      totalTopics: topics.length,
      totalBills: bills.length,
      totalEvents: events.length,
      totalRelatedVideos: relatedVideos.length
    }
  };
}

/**
 * Additional utility queries
 */

/**
 * Find videos by date range
 */
export function findVideosByDateRange(
  db: GraphDatabase,
  startDate: string,
  endDate: string
): Video[] {
  const videos = db.getNodesByType('Video') as Video[];
  return videos.filter(video => {
    const videoDate = new Date(video.metadata.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return videoDate >= start && videoDate <= end;
  }).sort((a, b) => new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime());
}

/**
 * Find most active speakers
 */
export function findMostActiveSpeakers(
  db: GraphDatabase,
  limit: number = 10
): Array<{ speaker: Speaker; appearanceCount: number }> {
  const speakers = db.getNodesByType('Speaker') as Speaker[];
  const speakerStats = speakers.map(speaker => ({
    speaker,
    appearanceCount: db.findVideosBySpeaker(speaker.id).length
  }));
  
  return speakerStats
    .sort((a, b) => b.appearanceCount - a.appearanceCount)
    .slice(0, limit);
}

/**
 * Find most discussed topics
 */
export function findMostDiscussedTopics(
  db: GraphDatabase,
  limit: number = 10
): Array<{ topic: Topic; discussionCount: number }> {
  const topics = db.getNodesByType('Topic') as Topic[];
  const topicStats = topics.map(topic => ({
    topic,
    discussionCount: db.findVideosByTopic(topic.id).length
  }));
  
  return topicStats
    .sort((a, b) => b.discussionCount - a.discussionCount)
    .slice(0, limit);
}

/**
 * Find videos by chamber
 */
export function findVideosByChamber(
  db: GraphDatabase,
  chamber: string
): Video[] {
  const videos = db.getNodesByType('Video') as Video[];
  return videos.filter(video => 
    video.metadata.chamber?.toLowerCase() === chamber.toLowerCase()
  );
}

/**
 * Find videos by event type
 */
export function findVideosByEventType(
  db: GraphDatabase,
  eventType: string
): Video[] {
  const videos = db.getNodesByType('Video') as Video[];
  return videos.filter(video => 
    video.metadata.eventType?.toLowerCase() === eventType.toLowerCase()
  );
} 