import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text, Row, Button, ProgressBar, Tag } from '@/components/ui';
import { ProgressRing } from '@/components/charts';
import { Icon } from '@/components/Icon';
import { useQuery } from '@/db/provider';
import { loadHealth } from '../healthLoad';
import { usePlus } from '@/features/entitlements/usePlus';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Money health score. Plus shows the score and what is behind it; free sees a locked preview. */
export function HealthCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const plus = usePlus();
  const locked = !plus.has('health_score');
  const q = useQuery((db) => loadHealth(db), []);
  const h = q.data;
  if (!h) return null;
  const tone = h.band === 'Strong' ? colors.income : h.band === 'Steady' ? colors.primary : colors.expense;

  return (
    <Card style={{ gap: space.lg }}>
      <Row style={{ gap: space.lg }}>
        <ProgressRing pct={locked ? 62 : h.score} size={92} stroke={10} color={locked ? colors.skeleton : tone}>
          {locked ? <Icon name="lock" color={colors.textSubtle} size={24} /> : <Text v="h1">{h.score}</Text>}
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Row style={{ gap: space.sm }}>
            <Text v="h2">Money health</Text>
            {locked ? <Tag label="Plus" tone="primary" /> : <Tag label={h.band} tone={h.band === 'Strong' ? 'income' : h.band === 'Steady' ? 'warn' : 'neutral'} />}
          </Row>
          <Text v="small" color={colors.textMuted}>
            {locked ? 'A 0 to 100 indicator built from your savings, budgets, subscriptions and cash cushion.' : `Weakest area: ${h.focus.label.toLowerCase()}.`}
          </Text>
        </View>
      </Row>
      {locked ? (
        <Button title="See your score with Plus" kind="secondary" icon="lock" onPress={() => router.push('/plus')} />
      ) : (
        <>
          <View style={{ gap: space.md }}>
            {h.parts.map((p) => (
              <View key={p.key} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text v="small">{p.label}</Text>
                  <Text v="small" color={colors.textMuted}>{p.value} · {p.points}/25</Text>
                </Row>
                <ProgressBar value={p.points / 25} color={p.points >= 18 ? colors.income : p.points >= 10 ? colors.primary : colors.expense} height={8} />
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: space.md, gap: 2 }}>
            <Text v="caps" color={colors.textMuted}>ONE THING TO TRY</Text>
            <Text v="small">{h.focus.tip}</Text>
          </View>
        </>
      )}
      <Text v="small" color={colors.textSubtle}>An indicator worked out from your own entries. It is not financial advice.</Text>
    </Card>
  );
}
