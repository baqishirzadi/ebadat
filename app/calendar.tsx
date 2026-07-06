import { Redirect } from 'expo-router';

export default function CalendarRedirect() {
  return <Redirect href={'/(tabs)/jantari' as never} />;
}
