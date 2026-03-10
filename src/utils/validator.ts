export function validateVideos(videos: any[]): string[] {
  const errors: string[] = [];
  for (const v of videos) {
    if (!v.id || !v.title || !v.date) errors.push(`Missing required field in video: ${JSON.stringify(v)}`);
  }
  return errors;
}

export function validateSpeakers(speakers: any[]): string[] {
  const errors: string[] = [];
  for (const s of speakers) {
    if (!s.id || !s.name) errors.push(`Missing required field in speaker: ${JSON.stringify(s)}`);
  }
  return errors;
}

export function validateTopics(topics: any[]): string[] {
  const errors: string[] = [];
  for (const t of topics) {
    if (!t.id || !t.name) errors.push(`Missing required field in topic: ${JSON.stringify(t)}`);
  }
  return errors;
} 