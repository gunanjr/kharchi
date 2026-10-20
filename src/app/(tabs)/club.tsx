import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Screen, Text, Row, Press, Button, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { BrandMark } from '@/components/Wordmark';
import { useDb } from '@/db/provider';
import { useIsPro, useProStore } from '@/features/pro/store';
import { PRODUCTS } from '@/features/pro/entitlement';
import { WIDGETS, PIN_TABS, useProStats, type ProWidget, type PinTab } from '@/features/pro/widgets';
import { AuraOrb, auraColors } from '@/features/mce/AuraOrb';
import { movesFor } from '@/features/mce/aura';
import { monthLines } from '@/features/story/stickers';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';

// The Pro tab is its own place: always dark and flat, whatever the app theme.
const BG = '#0B0D12', CARD = '#151A23', LINE = 'rgba(255,255,255,0.08)', INK = '#FFFFFF', SOFT = 'rgba(255,255,255,0.58)', DARK = '#14181F';
const GROUPS: { key: ProWidget['group']; title: string }[] = [
  { key: 'you', title: 'You' },
  { key: 'plan', title: 'Plan ahead' },
  { key: 'protect', title: 'Protect' },
  { key: 'understand', title: 'Understand' },
  { key: 'work', title: 'Work and tax' },
];
const IN_LIST = (w: ProWidget) => w.id !== 'aura' && w.id !== 'comingUp';
const PLAN_NAME: Record<string, string> = { [PRODUCTS.monthly]: 'Monthly', [PRODUCTS.yearly]: 'Yearly', [PRODUCTS.lifetime]: 'Lifetime' };

const Caps = ({ children, color = SOFT }: { children: React.ReactNode; color?: string }) => (
  <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color }}>{children}</Text>
);

/** One line of the weekly brief: a big figure, what it means, and where it leads. */
function BriefRow({ figure, line, sub, locked, last, onPress }: { figure: string; line: string; sub?: string; locked: boolean; last?: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={`${locked ? 'Locked' : figure} ${line}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: LINE }}>
      <Text style={{ width: 112, fontFamily: fonts.brandBlack, fontSize: 26, letterSpacing: -0.6, color: locked ? SOFT : INK }}>{locked ? '••' : figure}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 19, color: INK }}>{line}</Text>
        {sub ? <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: SOFT }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Icon name={locked ? 'lock' : 'chevron'} size={15} color={SOFT} />
    </Press>
  );
}

export default function ProTab() {
  const router = useRouter();
  const db = useDb();
  const pro = useIsPro();
  const plan = useProStore((s) => s.entitlement.productId);
  const { colors } = useTheme();
  const pins = useSettings((s) => s.proPins);
  const setSetting = useSettings((s) => s.set);
  const stats = useProStats();
  const [editing, setEditing] = useState(false);
  const money = (n: number) => formatMoney(n, 'INR', { compact: true });
  const go = (href: Href) => () => router.push(href);

  const aura = stats?.aura;
  const [c1] = auraColors(aura?.rank.key ?? 'npc');
  const now = Date.now();
  const next = stats ? movesFor(stats.txs, stats.sets, now, money).find((m) => !m.done) : null;
  const renewing = stats ? stats.radar.items.filter((v) => v.status === 'active' && !v.cancelled && v.renewsInDays >= 0 && v.renewsInDays <= 7) : [];
  const outThisWeek = stats ? stats.dues.reduce((a, d) => a + (d.amount ?? 0), 0) + renewing.reduce((a, v) => a + v.amount, 0) : 0;
  const outCount = (stats?.dues.length ?? 0) + renewing.length;
  const pace = stats ? monthLines(stats.txs, now) : null;
  const locked = !pro;

  function togglePin(tab: PinTab, id: string) {
    const cur = pins[tab];
    setSetting(db, 'proPins', { ...pins, [tab]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }

  return (
    <Screen style={{ backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 168, gap: space.xl }}>
        {/* membership header */}
        <Row style={{ paddingTop: space.lg, gap: space.md }}>
          <BrandMark size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, lineHeight: 32, color: INK, letterSpacing: -0.8 }}>BruhMe Pro</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT }}>{pro ? `${plan ? PLAN_NAME[plan] ?? 'Pro' : 'Pro'} member` : 'Not a member yet'}</Text>
          </View>
          {pro ? (
            <Press onPress={() => setEditing(true)} accessibilityLabel="Choose what shows on your other tabs" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="options" size={20} color={INK} />
            </Press>
          ) : null}
          <Press onPress={go('/settings')} accessibilityLabel="Settings" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="settings" size={20} color={INK} />
          </Press>
        </Row>

        {locked ? (
          <Press onPress={go('/pro')} accessibilityLabel="Start your free week of Pro" style={{ borderRadius: 28, padding: space.xl, gap: space.sm, backgroundColor: colors.primary }}>
            <Caps color={DARK}>7 DAYS FREE</Caps>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 32, lineHeight: 36, color: DARK, letterSpacing: -0.8 }}>See what your money{'\n'}is up to.</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(20,24,31,0.72)' }}>Then ₹999 a year or ₹129 a month. Cancel any time in Google Play.</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: DARK, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: INK }}>Start free week</Text>
            </View>
          </Press>
        ) : null}

        {/* the weekly brief */}
        <View style={{ backgroundColor: CARD, borderRadius: 28, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm, borderWidth: 1, borderColor: LINE }}>
          <Caps>THIS WEEK, PRO CAUGHT</Caps>
          <BriefRow figure={money(outThisWeek)} line="going out in the next 7 days" sub={outCount ? `${outCount} bills and renewals` : 'Nothing due. Enjoy the quiet.'} locked={locked} onPress={go('/dues')} />
          <BriefRow figure={String(stats?.radar.rises ?? 0)} line={stats?.radar.rises === 1 ? 'price rise on a subscription' : 'price rises on subscriptions'} sub={stats ? `${money(stats.radar.monthlyActive)} a month, all repeating` : undefined} locked={locked} onPress={go('/radar')} />
          {pace?.pct !== null && pace?.pct !== undefined ? (
            <BriefRow figure={`${pace.pct < 0 ? '−' : '+'}${Math.abs(pace.pct)}%`} line={`spent vs ${pace.prevLabel}, same days`} sub={pace.pct < 0 ? 'Nice. Make it a story.' : 'A calm week brings it back.'} locked={locked} onPress={go(pace.pct < 0 ? '/story' : '/deep-dive')} />
          ) : null}
          <BriefRow figure={money(stats?.claim.total ?? 0)} line="ready to claim from work" sub={stats?.claim.count ? `${stats.claim.count} work spends` : 'Tag spends #work to collect them'} locked={locked} onPress={go('/reimburse')} last />
        </View>

        {/* aura */}
        <Press onPress={go('/mce')} accessibilityLabel="Main Character Energy" style={{ borderRadius: 28, padding: space.lg, backgroundColor: c1 }}>
          <Row style={{ gap: space.md, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Caps color="rgba(20,24,31,0.6)">MAIN CHARACTER ENERGY</Caps>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: DARK, letterSpacing: -0.8 }} numberOfLines={2}>{aura?.rank.title ?? ' '}</Text>
              {next && pro ? <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: 'rgba(20,24,31,0.72)' }} numberOfLines={1}>Next: {next.title} · +{next.points}</Text> : null}
            </View>
            {aura ? <AuraOrb rank={aura.rank.key} score={aura.score} size={112} ink={DARK} track="rgba(20,24,31,0.14)" color={DARK} /> : <View style={{ width: 112, height: 112 }} />}
          </Row>
        </Press>

        {/* story maker */}
        <Press onPress={go('/story')} accessibilityLabel="Make a story" style={{ borderRadius: 28, padding: space.lg, backgroundColor: INK, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 62, height: 100, borderRadius: 14, backgroundColor: DARK, padding: 8, justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 19, lineHeight: 21, color: INK }}>24</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 7, color: INK }}>DAYS IN A ROW</Text>
            <Row style={{ gap: 2, marginTop: 4 }}>{Array.from({ length: 8 }, (_, i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: INK, opacity: i === 2 ? 0.3 : 1 }} />)}</Row>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, lineHeight: 26, color: DARK }}>Make a story</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: 'rgba(20,24,31,0.65)' }}>Your photo, with your streak or your spent-less line. Never an amount.</Text>
          </View>
          <Icon name="chevron" size={18} color={DARK} />
        </Press>

        {/* every tool, grouped */}
        {GROUPS.map((g) => {
          const items = WIDGETS.filter((w) => w.group === g.key && IN_LIST(w));
          if (!items.length) return null;
          return (
            <View key={g.key} style={{ gap: space.sm }}>
              <Caps>{g.title.toUpperCase()}</Caps>
              <View style={{ backgroundColor: CARD, borderRadius: 24, borderWidth: 1, borderColor: LINE, paddingHorizontal: space.lg }}>
                {items.map((w, i) => (
                  <Press key={w.id} onPress={go(w.href)} accessibilityLabel={w.title}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md + 2, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: LINE }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: INK }}>{w.title}</Text>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT }} numberOfLines={1}>{pro && stats ? stats.stat[w.id] : w.sub}</Text>
                    </View>
                    <Icon name={pro ? 'chevron' : 'lock'} size={15} color={SOFT} />
                  </Press>
                ))}
              </View>
            </View>
          );
        })}

        <Press onPress={go('/pro')} accessibilityLabel={pro ? 'Your plan' : 'See plans'} style={{ alignSelf: 'center', paddingVertical: space.sm }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: SOFT }}>{pro ? 'Manage plan · Friend codes · Restore' : 'Plans · Friend codes · Restore'}</Text>
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
