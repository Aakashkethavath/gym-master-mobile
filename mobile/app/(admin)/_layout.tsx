import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { palette, typography } from '@/theme/tokens';

const icon = (emoji: string, focused: boolean) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export default function AdminLayout() {
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
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => icon('📊', focused) }}
      />
      <Tabs.Screen
        name="members"
        options={{ title: 'Members', tabBarIcon: ({ focused }) => icon('👥', focused) }}
      />
      <Tabs.Screen
        name="trainers"
        options={{ title: 'Trainers', tabBarIcon: ({ focused }) => icon('🏋️', focused) }}
      />
      <Tabs.Screen
        name="plans"
        options={{ title: 'Plans', tabBarIcon: ({ focused }) => icon('💳', focused) }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: ({ focused }) => icon('⋯', focused) }}
      />
    </Tabs>
  );
}
