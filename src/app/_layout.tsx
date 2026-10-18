import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DbProvider, useDb } from '@/db/provider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { ErrorBoundary, SkeletonList } from '@/components/Feedback';
import { BiometricGate } from '@/features/security/BiometricGate';
import { useAppBootstrap } from '@/features/bootstrap';
import '@/features/native/headless';
import { quitIfQuickLaunch } from '@/features/native/quickAdd';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { colors, dark } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const router = useRouter();
  const segments = useSegments();
  useAppBootstrap();

  useEffect(() => {
    const inOnboarding = segments[0] === 'onboarding';
    if (quitIfQuickLaunch()) return; // quick-add host: never redirect
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    if (onboarded && inOnboarding) router.replace('/');
  }, [onboarded, segments, router]);

  return (
    <BiometricGate>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: quitIfQuickLaunch() ? 'transparent' : colors.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </BiometricGate>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <DbProvider fallback={<View style={{ flex: 1, paddingTop: 80 }}><SkeletonList /></View>}>
            <ThemeProvider>
              <Shell />
            </ThemeProvider>
          </DbProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
