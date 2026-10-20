import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Row, Text } from '@/components/ui';
import { ComingUp } from '@/features/profile/ComingUp';
import { auraColors, RankMark } from '@/features/mce/AuraOrb';
import { movesFor } from '@/features/mce/aura';
import { useIsPro } from './store';
import { useProStats } from './widgets';
import { ProStrip } from './ProStrip';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';

/** Today's aura on Home: rank, today's points and the next move worth making. Opens Main Character Energy. */
function AuraToday() {
  const router = useRouter();
  const { colors } = useTheme();
  const stats = useProStats();
  if (!stats) return null;
  const [c1] = auraColors(stats.aura.rank.key);
  const next = movesFor(stats.txs, stats.sets, Date.now(), (n) => formatMoney(n, 'INR', { compact: true })).find((m) => !m.done);
  return (
    <View style={{ paddingHorizontal: layout.gutter }}>
      <Card tone="ink" onPress={() => router.push('/mce')} accessibilityLabel={`Aura ${stats.aura.score}, ${stats.aura.rank.title}`} style={{ gap: space.md }}>
        <Row style={{ gap: space.md }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c1, alignItems: 'center', justifyContent: 'center' }}>
            <RankMark rank={stats.aura.rank.key} size={26} color="#14181F" off="rgba(20,24,31,0.2)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text v="caps" color={colors.onHeroMuted}>YOUR AURA</Text>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: colors.onHero }} numberOfLines={1}>{stats.aura.rank.title} · {stats.aura.score}</Text>
          </View>
          <View style={{ backgroundColor: c1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#14181F' }}>+{stats.aura.today?.points ?? 0}</Text>
          </View>
        </Row>
        {next ? <Text v="small" color={colors.onHeroMuted}>Next: {next.title} · +{next.points}</Text> : <Text v="small" color={colors.onHeroMuted}>Every move done today. Main character behaviour.</Text>}
      </Card>
    </View>
  );
}

/** Pro widgets the user pinned to Home (chosen on the Pro tab). Nothing for free users. */
export function HomePins() {
  const pro = useIsPro();
  const pins = useSettings((s) => s.proPins.home);
  if (!pro || !pins.length) return null;
  return (
    <>
      {pins.includes('aura') ? <AuraToday /> : null}
      {pins.includes('comingUp') ? <ComingUp /> : null}
      <View style={{ paddingHorizontal: layout.gutter }}><ProStrip tab="home" exclude={['aura', 'comingUp']} title="Pinned" /></View>
    </>
  );
}
