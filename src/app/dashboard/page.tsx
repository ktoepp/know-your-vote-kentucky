import { redirect } from 'next/navigation';

/** Legacy URL — profile activity is the post-login home for bill trackers. */
export default function DashboardPage() {
  redirect('/profile#activity');
}
