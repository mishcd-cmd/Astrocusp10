// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // When someone goes to / or comes back from Stripe,
  // send them to the Daily Astrology tab.
  return <Redirect href="/(tabs)/astrology" />;
}
