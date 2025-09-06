import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ title: 'EchoRoom' }} 
        />
        <Stack.Screen 
          name="chat" 
          options={{ title: 'Chat' }} 
        />
        <Stack.Screen 
          name="roundtable" 
          options={{ title: 'Roundtable' }} 
        />
      </Stack>
    </>
  );
}