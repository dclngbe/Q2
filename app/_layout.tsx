import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          height: 50,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          marginBottom: -4,
          height: 14,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 14,
          marginTop: -4,
          marginBottom: 2,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#374151',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'AA',
        }}
      />
      <Tabs.Screen
        name="surprise"
        options={{
          title: 'Surprise',
        }}
      />
    </Tabs>
  );
}
