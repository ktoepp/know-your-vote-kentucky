export function normalizeVideo(video: any) {
  return {
    id: video.id,
    title: video.title || '',
    date: video.date || '',
    summary: video.summary || '',
    transcript: video.transcript || '',
    speakers: Array.isArray(video.speakers) ? video.speakers : [],
    topics: Array.isArray(video.topics) ? video.topics : [],
    bills: Array.isArray(video.bills) ? video.bills : [],
  };
}

export function normalizeSpeaker(speaker: any) {
  return {
    id: speaker.id,
    name: speaker.name || '',
    title: speaker.title || '',
    party: speaker.party || '',
    bio: speaker.bio || '',
  };
}

export function normalizeTopic(topic: any) {
  return {
    id: topic.id,
    name: topic.name || '',
    description: topic.description || '',
    category: topic.category || '',
  };
} 