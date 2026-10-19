import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { Illustration } from '@/components/Feedback';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { backendConfigured } from '@/features/sync';
import { space } from '@/theme/tokens';

export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  return (
    <SubScreen title="Invite to group">
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
        <Illustration kind="group" size={160} />
        <Text v="h2" style={{ textAlign: 'center' }}>{backendConfigured ? 'Invite link' : 'Available after a backend is connected'}</Text>
        <Text color={colors.textMuted} style={{ textAlign: 'center' }}>
          Invite links and QR codes need an online account so your friends’ phones can join the same group and stay in sync. Until then, groups live on this phone: add people by name and share summaries as text or image.
        </Text>
      </View>
      <Card style={{ gap: space.xs, opacity: 0.6 }}>
        <Text v="caps" color={colors.textMuted}>INVITE CODE</Text>
        <Text v="h1" style={{ letterSpacing: 4 }}>— — — — — —</Text>
        <Text v="small" color={colors.textMuted}>Group {id.slice(0, 8)}</Text>
      </Card>
      <Button title="Share summary instead" kind="secondary" onPress={() => {}} disabled />
    </SubScreen>
  );
}
