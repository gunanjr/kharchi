import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { DbProvider } from '@/db/provider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { ErrorBoundary } from '@/components/Feedback';
import { BiometricGate } from '@/features/security/BiometricGate';
import { useAppBootstrap } from '@/features/bootstrap';
import '@/features/native/headless';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Shown for a moment while SQLite opens. Transparent, so a Quick Add window never flashes a full-screen skeleton. */
function BootPlaceholder() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: '#FFFAF0', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 14 }}>
        <View style={{ height: 22, width: 120, borderRadius: 8, backgroundColor: '#E9DCC4' }} />
        <View style={{ height: 44, width: 160, borderRadius: 10, backgroundColor: '#E9DCC4' }} />
        <View style={{ height: 48, borderRadius: 14, backgroundColor: '#EFE4CF' }} />
      </View>
    </View>
  );
}

function Shell() {
  const { colors, dark } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const router = useRouter();
  const segments = useSegments();
  useAppBootstrap();

  useEffect(() => {
    const inOnboarding = segments[0] === 'onboarding';
    if (segments[0] === 'quick-add' || segments[0] === 'scan-bill') return; // quick-add host: never redirect
    if (!onboarded && !inOnboarding) router.replace('/onboarding');
    if (onboarded && inOnboarding) router.replace('/');
  }, [onboarded, segments, router]);

  return (
    <BiometricGate>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="add" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-add" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="scan-bill" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      </Stack>
    </BiometricGate>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <DbProvider fallback={<BootPlaceholder />}>
            <ThemeProvider>
              <Shell />
            </ThemeProvider>
          </DbProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
