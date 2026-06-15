import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { palette } from '@/theme/tokens';

import { useFonts } from 'expo-font';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import {
  Syne_700Bold,
  Syne_600SemiBold,
} from '@expo-google-fonts/syne';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 min before refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Handles route protection: redirects unauthenticated users to login and
 * authenticated users away from the auth screens.
 */
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inClient = segments[0] === '(client)';
    const isFeedback = (segments[0] as string) === 'feedback';

    if (isFeedback) return;

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (user.role === 'admin') {
      if (!inAdmin) router.replace('/(admin)/dashboard');
    } else {
      if (!inClient) router.replace('/(client)/home');
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Syne-Bold': Syne_700Bold,
    'Syne-SemiBold': Syne_600SemiBold,
    'InterTight-Regular': InterTight_400Regular,
    'InterTight-Medium': InterTight_500Medium,
    'InterTight-SemiBold': InterTight_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return null; // Keep splash/loading visible until fonts load
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationGuard>
              <StatusBar style="light" backgroundColor={palette.bg} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: palette.bg },
                  animation: 'fade',
                }}
              />
            </NavigationGuard>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
