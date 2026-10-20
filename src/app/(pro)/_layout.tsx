import React from 'react';
import { Stack } from 'expo-router';
import { ProThemeProvider, useTheme } from '@/theme/ThemeProvider';

function ProStack() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}

/** Every screen opened from the Pro tab lives here and takes the Pro palette. URLs are unchanged (route group). */
export default function ProLayout() {
  return <ProThemeProvider><ProStack /></ProThemeProvider>;
}
