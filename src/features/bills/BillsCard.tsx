import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Row, Text, Enter, IconTile } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useQuery } from '@/db/provider';
import { listBills } from './repo';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

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
        style={{ marginHorizontal: layout.gutter, backgroundColor: colors.primarySoft, borderColor: colors.primary }}
      >
        <Row style={{ gap: 12 }}>
          <IconTile icon="receipt" size={44} />
          <View style={{ flex: 1 }}>
            <Text v="title">{n === 1 ? '1 bill waiting to be split' : `${n} bills waiting to be split`}</Text>
            <Text v="small" color={colors.textMuted}>Tap to choose who had what</Text>
          </View>
          <Row style={{ gap: 4 }}><Text v="title" color={colors.link}>Split</Text><Icon name="chevron" size={16} color={colors.link} /></Row>
        </Row>
      </Card>
    </Enter>
  );
}
