import { Redirect } from 'expo-router';

/** Monthly review now opens last month's Wrapped story (one place for the month in pictures). */
export default function Review() {
  return <Redirect href={{ pathname: '/wrapped', params: { tab: 'month', off: '1' } }} />;
}
