import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { palette, typography } from '@/theme/tokens';

const icon = (emoji: string, focused: boolean) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarLabelStyle: {
          fontFamily: typography.bodyMedium,
          fontSize: typography.size.xs,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen name="home"       options={{ title: 'Home',       tabBarIcon: ({ focused }) => icon('🏠', focused) }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ focused }) => icon('📅', focused) }} />
      <Tabs.Screen name="exercises"  options={{ title: 'Exercises',  tabBarIcon: ({ focused }) => icon('🏋️', focused) }} />
      <Tabs.Screen name="workouts"   options={{ title: 'Workouts',   tabBarIcon: ({ focused }) => icon('💪', focused) }} />
      <Tabs.Screen name="plans"      options={{ title: 'Plans',      tabBarIcon: ({ focused }) => icon('💳', focused) }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    tabBarIcon: ({ focused }) => icon('👤', focused) }} />
      {/* Payment screen — hidden from tabs, navigated programmatically */}
      <Tabs.Screen name="payment"    options={{ href: null }} />
    </Tabs>
  );
}
