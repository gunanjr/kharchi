import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Row, Text, Enter } from '@/components/ui';
import { useQuery } from '@/db/provider';
import { listBills } from './repo';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Home: "1 bill waiting to be split". Hidden when there are none. */
export function BillsCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const q = useQuery((d) => listBills(d, 'new'), []);
  const n = q.data?.length ?? 0;
  if (!n) return null;
  const first = q.data![0];
  return (
    <Enter>
      <Card
        onPress={() => router.push(n === 1 ? `/bill/${first.id}` : '/bills')}
        accessibilityLabel={`${n} bill${n === 1 ? '' : 's'} waiting to be split`}
        style={{ marginHorizontal: space.lg, backgroundColor: colors.primarySoft, borderColor: colors.primary }}
      >
        <Row>
          <Text style={{ fontSize: 28 }}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text v="title">{n === 1 ? '1 bill waiting to be split' : `${n} bills waiting to be split`}</Text>
            <Text v="small" color={colors.textMuted}>Tap to choose who had what</Text>
          </View>
          <Text v="title" color={colors.primary}>Split →</Text>
        </Row>
      </Card>
    </Enter>
  );
}
