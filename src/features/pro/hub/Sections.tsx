import React from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Press, Text, Row } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { AuraOrb, RankMark, auraColors } from '@/features/mce/AuraOrb';
import { movesFor, seasonDaysLeft, RANKS } from '@/features/mce/aura';
import { formatMoney } from '@/domain/money';
import { fonts, space } from '@/theme/tokens';
import type { useProStats } from '@/features/pro/widgets';
import { Caps, StoryRail } from './Blocks';
import { ForecastCard } from './Report';
import type { SeasonTheme } from './theme';

type Stats = NonNullable<ReturnType<typeof useProStats>>;
const money = (n: number) => formatMoney(n, 'INR', { compact: true });

function Panel({ t, children, onPress, label }: { t: SeasonTheme; children: React.ReactNode; onPress?: () => void; label?: string }) {
  const style = { borderRadius: 24, backgroundColor: t.tile, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: t.line };
  return onPress ? <Press onPress={onPress} accessibilityLabel={label} style={style}>{children}</Press> : <View style={style}>{children}</View>;
}
function Line({ t, title, sub, right, onPress, last }: { t: SeasonTheme; title: string; sub?: string; right?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Press onPress={onPress} accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: t.ink }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: t.soft }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? <Text style={{ fontFamily: fonts.brandBlack, fontSize: 15, color: t.ink }}>{right}</Text> : null}
    </Press>
  );
}
function More({ t, title, href }: { t: SeasonTheme; title: string; href: Href }) {
  const router = useRouter();
  return (
    <Press onPress={() => router.push(href)} accessibilityLabel={title} style={{ alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: t.accent, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: t.accent }}>{title}</Text>
      <Icon name="chevron" size={13} color={t.accent} />
    </Press>
  );
}

export function SeasonSection({ t, stats }: { t: SeasonTheme; stats: Stats }) {
  const moves = movesFor(stats.txs, stats.sets, Date.now(), money);
  const days = seasonDaysLeft(Date.now());
  const next = RANKS[RANKS.findIndex((r) => r.key === stats.aura.rank.key) + 1];
  return (
    <View style={{ gap: space.md }}>
      <View style={{ borderRadius: 28, backgroundColor: t.accent, padding: space.lg, gap: 6 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: 'rgba(20,24,31,0.6)' }}>{t.name.toUpperCase()} SEASON</Text>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: '#14181F' }}>{days} days left</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(20,24,31,0.72)' }}>{next && stats.aura.toNext !== null ? `${stats.aura.toNext} aura to reach ${next.title}. Your rank on the last day is yours to keep.` : 'Top rank. Hold it to the last day and it is yours.'}</Text>
      </View>
      <Panel t={t}>
        <Row style={{ gap: space.lg }}>
          <AuraOrb rank={stats.aura.rank.key} score={stats.aura.score} size={120} color={t.accent} track={t.line} />
          <View style={{ flex: 1, gap: 6 }}>
            <RankMark rank={stats.aura.rank.key} size={22} color={t.accent} off={t.line} />
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 24, lineHeight: 28, color: t.ink }}>{stats.aura.rank.title}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: t.soft }}>+{stats.aura.today?.points ?? 0} aura today</Text>
          </View>
        </Row>
      </Panel>
      <Panel t={t}>
        <Caps color={t.accent}>TODAY’S MOVES</Caps>
        {moves.map((m, i) => (
          <Row key={m.key} style={{ gap: space.md, paddingBottom: i === moves.length - 1 ? 0 : space.sm, borderBottomWidth: i === moves.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: m.done ? t.accent : 'transparent', borderWidth: m.done ? 0 : 2, borderColor: t.line }}>{m.done ? <Icon name="check" size={14} color="#14181F" /> : null}</View>
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: m.done ? t.soft : t.ink }}>{m.title}</Text>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 15, color: m.done ? t.soft : t.accent }}>+{m.points}</Text>
          </Row>
        ))}
      </Panel>
      {stats.seasons.length ? (
        <Panel t={t}>
          <Caps color={t.soft}>PAST SEASONS</Caps>
          <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
            {stats.seasons.map((x) => (
              <View key={x.label} style={{ width: 92, borderRadius: 16, padding: space.sm, gap: 4, backgroundColor: auraColors(x.rank.key)[0] }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: 'rgba(20,24,31,0.65)' }}>{x.label.toUpperCase()}</Text>
                <RankMark rank={x.rank.key} size={18} color="#14181F" off="rgba(20,24,31,0.2)" />
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#14181F' }} numberOfLines={1}>{x.rank.title}</Text>
              </View>
            ))}
          </Row>
        </Panel>
      ) : null}
      <More t={t} title="Your era, aura card and history" href="/mce" />
    </View>
  );
}

export function StoriesSection({ t, stats }: { t: SeasonTheme; stats: Stats }) {
  return (
    <View style={{ gap: space.md }}>
      <Panel t={t}>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 24, lineHeight: 28, color: t.ink }}>Post the habit,{'\n'}not the amount.</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: t.soft }}>Pick a sticker, add your own photo, move and resize it, share to your story. No amounts ever.</Text>
      </Panel>
      <StoryRail t={t} stats={stats} />
      <More t={t} title="Open the story maker" href="/story" />
    </View>
  );
}

export function MoneySection({ t, stats, locked }: { t: SeasonTheme; stats: Stats; locked: boolean }) {
  const router = useRouter();
  const mask = (s: string) => (locked ? '••' : s);
  const subs = stats.radar.items.filter((v) => v.status === 'active' && !v.cancelled).sort((a, b) => a.renewsInDays - b.renewsInDays).slice(0, 5);
  return (
    <View style={{ gap: space.md }}>
      <ForecastCard t={t} stats={stats} locked={locked} />
      <Panel t={t}>
        <Caps color={t.accent}>DUE SOON</Caps>
        {stats.dues.length ? stats.dues.slice(0, 5).map((d, i, a) => <Line key={d.id} t={t} title={d.name} sub={d.inDays < 0 ? `Overdue by ${-d.inDays} ${d.inDays === -1 ? 'day' : 'days'}` : d.inDays === 0 ? 'Due today' : d.inDays === 1 ? 'Due tomorrow' : `In ${d.inDays} days`} right={d.amount ? mask(money(d.amount)) : undefined} onPress={() => router.push('/dues')} last={i === a.length - 1} />) : <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: t.soft }}>Nothing due this week.</Text>}
      </Panel>
      <Panel t={t}>
        <Row style={{ justifyContent: 'space-between' }}><Caps color={t.accent}>REPEATING CHARGES</Caps><Text style={{ fontFamily: fonts.brandBlack, fontSize: 14, color: t.ink }}>{mask(`${money(stats.radar.monthlyActive)}/mo`)}</Text></Row>
        {subs.map((v, i) => <Line key={v.key} t={t} title={v.name} sub={`${v.change > 0 ? 'Price went up · ' : ''}${v.renewsInDays <= 0 ? 'renews today' : v.renewsInDays === 1 ? 'renews tomorrow' : `renews in ${v.renewsInDays} days`}`} right={mask(money(v.amount))} onPress={() => router.push('/radar')} last={i === subs.length - 1} />)}
      </Panel>
      <Panel t={t} onPress={() => router.push('/reimburse')} label="Reimbursements">
        <Row style={{ justifyContent: 'space-between' }}><Caps color={t.accent}>READY TO CLAIM</Caps><Icon name="chevron" size={14} color={t.soft} /></Row>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, color: t.ink }}>{mask(money(stats.claim.total))}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: t.soft }}>{stats.claim.count} work spends · one tap to a PDF with receipts</Text>
      </Panel>
      <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
        <More t={t} title="Deep dive" href="/deep-dive" />
        <More t={t} title="Tax totals" href="/tax" />
        <More t={t} title="Spaces" href="/spaces" />
      </Row>
    </View>
  );
}
