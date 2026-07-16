export const LANDING_TOPICS = [
  { label: 'Education', topic: 'Education' },
  { label: 'Agriculture', topic: 'Agriculture' },
  { label: 'Transportation', topic: 'Transportation' },
  { label: 'Health', topic: 'Healthcare' },
  { label: 'Budget', topic: 'Budget' },
  { label: 'Environment', topic: 'Environment' },
  { label: 'Criminal justice', topic: 'Criminal Justice' },
] as const;

export const LANDING_FEATURE_CARDS = [
  {
    title: 'Find your reps',
    body: 'Enter your address, see your House + Senate rep',
    href: '/members/map',
  },
  {
    title: 'Track bills',
    body: 'Browse and search bills & resolutions by topic',
    href: '/bills',
  },
  {
    title: 'Get notified',
    body: 'Email alerts when followed bills move',
    href: '/auth/login',
  },
] as const;
