import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FCF9F7' },
        animation: 'slide_from_right',
      }}
    />
  );
}
