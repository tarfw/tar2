import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the main tabs screen (tabs index)
  return <Redirect href="/(tabs)/" />;
}