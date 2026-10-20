import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Text, Row, ProgressBar, Tag, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ProgressRing } from '@/components/charts';
import { useQuery } from '@/db/provider';
import { loadHealth } from '../healthLoad';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const GO: Record<string, { to: string; label: string }> = {
  savings: { to: '/goals', label: 'Start a savings goal' },
  budgets: { to: '/budgets', label: 'Open budgets' },
  subs: { to: '/settings/recurring', label: 'See repeating charges' },
  cushion: { to: '/goals', label: 'Start a savings goal' },
};

/** Money health: an indicator worked out on the device from the user's own entries. An estimate, not financial advice. */
export function HealthCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery((db) => loadHealth(db), []);
  const h = q.data;
  if (!h) return null;
  const colorFor = (pts: number) => (pts >= 18 ? colors.income : pts >= 10 ? colors.primary : colors.expense);
  const tone = h.band === 'Strong' ? colors.income : h.band === 'Steady' ? colors.primary : colors.expense;

  return (
    <View style={{ gap: space.md }}>
      <Card style={{ gap: space.md }}>
        <Row style={{ gap: space.lg }}>
          <ProgressRing pct={h.score} size={84} stroke={9} color={tone}>
            <Text v="h2">{h.score}</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ gap: space.sm }}>
              <Text v="h3">{h.score} out of 100</Text>
              <Tag label={h.band} tone={h.band === 'Strong' ? 'income' : h.band === 'Steady' ? 'warn' : 'neutral'} />
            </Row>
            <Text v="small" color={colors.textMuted}>Weakest area: {h.focus.label.toLowerCase()}. Tap a box to see why.</Text>
          </View>
        </Row>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {h.parts.map((p) => (
          <Press key={p.key} onPress={() => setOpen(open === p.key ? null : p.key)} accessibilityLabel={`${p.label}, ${p.value}, ${p.points} of 25`} accessibilityState={{ expanded: open === p.key }} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <Card style={{ gap: 8, minHeight: 112 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text v="small" color={colors.textMuted}>{p.label}</Text>
                <Icon name={open === p.key ? 'arrowUp' : 'arrowDown'} size={14} color={colors.textSubtle} />
              </Row>
              <Text v="title" numberOfLines={2}>{p.value}</Text>
              <View style={{ flex: 1 }} />
              <ProgressBar value={p.points / 25} color={colorFor(p.points)} height={6} />
              <Text v="small" color={colors.textSubtle}>{p.points} of 25</Text>
            </Card>
          </Press>
        ))}
      </View>
      {open ? (() => {
        const p = h.parts.find((x) => x.key === open)!;
        return (
          <Card tone="inset" style={{ gap: space.sm }}>
            <Text v="caps" color={colors.textMuted}>{p.label.toUpperCase()}</Text>
            <Text>{p.tip}</Text>
            <Button title={GO[p.key].label} kind="secondary" size="sm" onPress={() => router.push(GO[p.key].to as never)} style={{ alignSelf: 'flex-start' }} />
          </Card>
        );
      })() : (
        <Card tone="inset" style={{ gap: 4 }}>
          <Text v="caps" color={colors.textMuted}>ONE THING TO TRY</Text>
          <Text>{h.focus.tip}</Text>
        </Card>
      )}
    </View>
  );
}
