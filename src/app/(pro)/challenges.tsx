import React from 'react';
import { SubScreen, Text } from '@/components/ui';
import { ToastHost } from '@/components/Toast';
import { ChallengeBoard } from '@/features/challenges/ChallengeBoard';
import { useTheme } from '@/theme/ThemeProvider';

/** Challenges (Pro): short opt-in goals, checked daily from your own entries. Failing costs nothing; start again. */
export default function Challenges() {
  const { colors } = useTheme();
  return (
    <SubScreen title="Challenges">
      <Text color={colors.textMuted}>Short goals with a finish line, checked every day from what you log. Missing one costs nothing.</Text>
      <ChallengeBoard />
      <ToastHost />
    </SubScreen>
  );
}
