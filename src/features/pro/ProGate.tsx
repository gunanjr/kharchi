import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Row, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { useIsPro } from './store';

/** Shows children for Pro users; otherwise a calm card saying what the feature does, with one way to Pro. */
export function ProGate({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  const pro = useIsPro();
  const router = useRouter();
  const { colors } = useTheme();
  if (pro) return <>{children}</>;
  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ gap: space.md }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={19} color={colors.link} /></View>
        <View style={{ flex: 1 }}>
          <Text v="title">{title}</Text>
          <Text v="small" color={colors.textMuted}>Part of BruhMe Pro</Text>
        </View>
      </Row>
      <Text color={colors.textMuted}>{body}</Text>
      <Button title="See Pro" kind="accent" onPress={() => router.push('/pro')} />
    </Card>
  );
}
