// Labels are human-first but keep click-scent with the browse filter's topic values
// (the words should survive the click to /bills?topic=X).
export const LANDING_TOPICS = [
  { label: 'Schools & education', topic: 'Education' },
  { label: 'Health care', topic: 'Healthcare' },
  { label: 'Roads & transportation', topic: 'Transportation' },
  { label: 'Budget & taxes', topic: 'Budget' },
  { label: 'Farms & agriculture', topic: 'Agriculture' },
  { label: 'Land, water & environment', topic: 'Environment' },
  { label: 'Crime & criminal justice', topic: 'Criminal Justice' },
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
