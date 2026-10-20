import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Row, Press, Button, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { BrandMark } from '@/components/Wordmark';
import { useDb } from '@/db/provider';
import { useIsPro } from '@/features/pro/store';
import { WIDGETS, PIN_TABS, useProStats, type ProWidget, type PinTab } from '@/features/pro/widgets';
import { AuraOrb, auraColors } from '@/features/mce/AuraOrb';
import { movesFor } from '@/features/mce/aura';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';

// The Pro tab is its own place: always dark, whatever the app theme, so stepping into it feels different.
const BG = '#0B0D12', CARD = '#151A23', LINE = 'rgba(255,255,255,0.08)', INK = '#FFFFFF', SOFT = 'rgba(255,255,255,0.6)';
const GROUPS: { key: ProWidget['group']; title: string }[] = [
  { key: 'you', title: 'You' },
  { key: 'plan', title: 'Plan ahead' },
  { key: 'protect', title: 'Protect' },
  { key: 'understand', title: 'Understand' },
  { key: 'work', title: 'Work and tax' },
];
const IN_GRID = (w: ProWidget) => w.id !== 'aura' && w.id !== 'comingUp';

/** A number-first card: what Pro is watching for you right now. */
function Glance({ label, value, sub, locked, onPress }: { label: string; value: string; sub: string; locked: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={{ width: 168, backgroundColor: CARD, borderRadius: 22, padding: space.lg, gap: 4, borderWidth: 1, borderColor: LINE }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: SOFT }}>{label}</Text>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: INK, letterSpacing: -0.5 }}>{locked ? '₹ ••••' : value}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: SOFT }} numberOfLines={1}>{sub}</Text>
    </Press>
  );
}

export default function ProTab() {
  const router = useRouter();
  const db = useDb();
  const pro = useIsPro();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pins = useSettings((s) => s.proPins);
  const setSetting = useSettings((s) => s.set);
  const stats = useProStats();
  const [editing, setEditing] = useState(false);
  const money = (n: number) => formatMoney(n, 'INR', { compact: true });
  const cardW = width - layout.gutter * 2;

  const aura = stats?.aura;
  const [c1] = auraColors(aura?.rank.key ?? 'npc');
  const next = stats ? movesFor(stats.txs, stats.sets, Date.now(), money).find((m) => !m.done) : null;
  const renewing = stats ? stats.radar.items.filter((v) => v.status === 'active' && !v.cancelled && v.renewsInDays >= 0 && v.renewsInDays <= 7) : [];
  const outThisWeek = stats ? stats.dues.reduce((a, d) => a + (d.amount ?? 0), 0) + renewing.reduce((a, v) => a + v.amount, 0) : 0;
  const outCount = (stats?.dues.length ?? 0) + renewing.length;

  function togglePin(tab: PinTab, id: string) {
    const cur = pins[tab];
    setSetting(db, 'proPins', { ...pins, [tab]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }

  return (
    <Screen style={{ backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 168, gap: space.xl }}>
        <Row style={{ paddingTop: space.lg, gap: space.sm }}>
          <BrandMark size={34} />
          <Text style={{ flex: 1, fontFamily: fonts.brandBlack, fontSize: 30, color: INK, letterSpacing: -0.8 }}>Pro</Text>
          {pro ? (
            <Press onPress={() => setEditing(true)} accessibilityLabel="Choose what shows on your other tabs" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="options" size={20} color={INK} />
            </Press>
          ) : null}
          <Press onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="settings" size={20} color={INK} />
          </Press>
        </Row>

        {!pro ? (
          <Press onPress={() => router.push('/pro')} accessibilityLabel="Start your free week of Pro" style={{ borderRadius: 28, padding: space.xl, gap: space.sm, backgroundColor: colors.primary }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: INK }}>7 DAYS FREE</Text>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: INK, letterSpacing: -0.8 }}>Everything below,{'\n'}unlocked.</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Then ₹999 a year, or ₹129 a month. Cancel any time.</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: INK, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#14181F' }}>Start free week</Text>
            </View>
          </Press>
        ) : null}

        {/* aura hero: the one thing that changes every day */}
        <Press onPress={() => router.push('/mce')} accessibilityLabel="Main Character Energy" style={{ borderRadius: 28, padding: space.lg, backgroundColor: c1 }}>
          <Row style={{ gap: space.md, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color: 'rgba(20,24,31,0.6)' }}>MAIN CHARACTER ENERGY</Text>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: '#14181F', letterSpacing: -0.8 }} numberOfLines={2}>{aura?.rank.title ?? ' '}</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#14181F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: c1 }}>+{aura?.today?.points ?? 0} today</Text>
              </View>
            </View>
            {aura ? <AuraOrb rank={aura.rank.key} score={aura.score} size={120} ink="#14181F" track="rgba(20,24,31,0.14)" color="#14181F" /> : <View style={{ width: 120, height: 120 }} />}
          </Row>
          {next ? (
            <Row style={{ marginTop: space.md, backgroundColor: 'rgba(20,24,31,0.08)', borderRadius: 16, padding: space.md, gap: space.sm }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: '#14181F' }} numberOfLines={1}>Next: {next.title}</Text>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 14, color: '#14181F' }}>+{next.points}</Text>
            </Row>
          ) : null}
        </Press>

        {/* story maker: the share moment */}
        <Press onPress={() => router.push('/story')} accessibilityLabel="Make a story" style={{ borderRadius: 28, padding: space.lg, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 64, height: 96, borderRadius: 14, backgroundColor: '#14181F', padding: 8, justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, lineHeight: 22, color: '#FFFFFF' }}>−14%</Text>
            <View style={{ height: 2, borderRadius: 1, backgroundColor: '#FFFFFF', marginTop: 4, width: '80%' }} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, lineHeight: 26, color: '#14181F' }}>Make a story</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13.5, color: 'rgba(20,24,31,0.65)' }}>Your photo with your streak, spent-less line or no-spend days. Never an amount.</Text>
          </View>
          <Icon name="chevron" size={18} color="#14181F" />
        </Press>

        {/* at a glance */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -layout.gutter }} contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: space.sm }}>
          <Glance label="Going out this week" value={money(outThisWeek)} sub={outCount ? `${outCount} bills and renewals` : 'Nothing due'} locked={!pro} onPress={() => router.push('/dues')} />
          <Glance label="Repeating charges" value={`${money(stats?.radar.monthlyActive ?? 0)}/mo`} sub={stats?.radar.rises ? `${stats.radar.rises} price rise${stats.radar.rises > 1 ? 's' : ''}` : 'No price rises'} locked={!pro} onPress={() => router.push('/radar')} />
          <Glance label="To claim from work" value={money(stats?.claim.total ?? 0)} sub={stats?.claim.count ? `${stats.claim.count} work ${stats.claim.count === 1 ? 'spend' : 'spends'}` : 'Nothing to claim'} locked={!pro} onPress={() => router.push('/reimburse')} />
        </ScrollView>

        {GROUPS.map((g) => {
          const items = WIDGETS.filter((w) => w.group === g.key && IN_GRID(w));
          if (!items.length) return null;
          return (
            <View key={g.key} style={{ gap: space.sm }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: SOFT }}>{g.title.toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {items.map((w, i) => (
                  <Press key={w.id} onPress={() => router.push(w.href)} accessibilityLabel={w.title}
                    style={{ width: items.length % 2 === 1 && i === items.length - 1 ? cardW : (cardW - space.sm) / 2, minHeight: 96, backgroundColor: CARD, borderRadius: 22, padding: space.md, gap: 10, borderWidth: 1, borderColor: LINE }}>
                    <Row style={{ justifyContent: 'space-between', gap: space.sm }}>
                      <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: INK }} numberOfLines={1}>{w.title}</Text>
                      {pro ? <Icon name="chevron" size={16} color={SOFT} /> : <Icon name="lock" size={14} color={SOFT} />}
                    </Row>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: SOFT, marginTop: 'auto' }} numberOfLines={2}>{pro && stats ? stats.stat[w.id] : w.sub}</Text>
                  </Press>
                ))}
              </View>
            </View>
          );
        })}

        <Press onPress={() => router.push('/pro')} accessibilityLabel={pro ? 'Your plan' : 'See plans'} style={{ backgroundColor: CARD, borderRadius: 22, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: LINE }}>
          <Icon name="ribbon" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: INK }}>{pro ? 'Your plan' : 'Plans and friend codes'}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: SOFT }}>{pro ? 'Manage, restore, share your friend code' : 'Yearly, monthly or lifetime'}</Text>
          </View>
          <Icon name="chevron" size={16} color={SOFT} />
        </Press>
      </ScrollView>

      {editing ? (
        <Sheet onClose={() => setEditing(false)}>
          <View style={{ gap: space.md }}>
            <Text v="h3">Pin to your tabs</Text>
            <Text v="small" color={colors.textMuted}>Choose which Pro tools show up on Home, Insights and Groups.</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space.md }}>
              {WIDGETS.filter((w) => w.id !== 'aura').map((w) => (
                <View key={w.id} style={{ gap: 6 }}>
                  <Text v="title">{w.title}</Text>
                  <Row style={{ gap: space.sm }}>
                    {PIN_TABS.filter((t) => (w.id === 'comingUp' ? t.key === 'home' : true)).map((t) => <Chip key={t.key} label={t.label} selected={pins[t.key].includes(w.id)} onPress={() => togglePin(t.key, w.id)} />)}
                  </Row>
                </View>
              ))}
            </ScrollView>
            <Button title="Done" kind="accent" onPress={() => setEditing(false)} />
          </View>
        </Sheet>
      ) : null}
    </Screen>
  );
}
