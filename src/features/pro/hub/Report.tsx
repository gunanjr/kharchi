import React, { useRef } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Text, Row, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { reportCard, verdict } from '@/features/pro/report';
import { monthForecast } from '@/features/pro/forecast';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { fonts, space } from '@/theme/tokens';
import type { useProStats } from '@/features/pro/widgets';
import type { SeasonTheme } from './theme';

type Stats = NonNullable<ReturnType<typeof useProStats>>;
const money = (n: number) => formatMoney(n, 'INR', { compact: true });

const GO: Record<string, { href: Href; cta: string }> = {
  logging: { href: '/add', cta: 'Log something now' },
  pace: { href: '/deep-dive', cta: 'See where it went' },
  calm: { href: '/challenges', cta: 'Start 7 no-spend days' },
  bills: { href: '/dues', cta: 'Open Due dates' },
};

/**
 * The month's report card. The shareable part is only the grade (badge, score, verdict, trend), never the weaker
 * numbers. Below it, four habit tiles you can tap, the weakest marked Focus, and one action to take this week.
 */
export function ReportSection({ t, stats, locked }: { t: SeasonTheme; stats: Stats; locked: boolean }) {
  const router = useRouter();
  const dues = useSettings((s) => s.dueItems);
  const name = useSettings((s) => s.profileName);
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const now = Date.now();
  const d = new Date(now);
  const r = reportCard(stats.txs, dues, d.getFullYear(), d.getMonth(), now);
  const last = reportCard(stats.txs, dues, d.getFullYear(), d.getMonth() - 1, now);
  const v = verdict(r.total);
  const weakest = [...r.habits].sort((a, b) => a.score - b.score)[0];
  const monthDays = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const up = r.total - last.total;
  async function share() {
    if (locked) return router.push('/pro');
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }
  return (
    <View style={{ gap: space.lg }}>
      {/* the grade: this is what gets shared */}
      <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.accent, padding: space.lg, gap: space.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 6 }}><BrandMark size={20} /><Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: 'rgba(20,24,31,0.7)' }}>{(name ? `${name}’s ` : '').toUpperCase()}{r.month.toUpperCase()} REPORT</Text></Row>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: 'rgba(20,24,31,0.6)' }}>DAY {r.days} OF {monthDays}</Text>
          </Row>
          <Row style={{ gap: space.lg, alignItems: 'center' }}>
            <View style={{ width: 104, height: 104, borderRadius: 30, backgroundColor: '#14181F', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: r.grade.length > 1 ? 48 : 58, lineHeight: 66, color: t.accent }}>{locked ? '?' : r.grade}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Row style={{ alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontFamily: fonts.brandBlack, fontSize: 36, lineHeight: 40, color: '#14181F' }}>{locked ? '••' : r.total}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: 'rgba(20,24,31,0.55)' }}>/100</Text>
              </Row>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, lineHeight: 21, color: '#14181F' }}>{v.line}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: 'rgba(20,24,31,0.65)' }}>{v.next ? `${v.toNext} points to ${v.next}` : 'Top grade'} · last month {last.grade}{up ? ` (${up > 0 ? '+' : '−'}${Math.abs(up)})` : ''}</Text>
            </View>
          </Row>
        </View>
      </ViewShot>

      {/* the four habits */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {r.habits.map((h) => {
          const focus = h.key === weakest.key;
          return (
            <Press key={h.key} onPress={() => router.push(locked ? '/pro' : GO[h.key].href)} accessibilityLabel={`${h.title}, ${h.score} of 25`}
              style={{ width: '48.5%', minHeight: 132, borderRadius: 22, backgroundColor: t.tile, padding: space.md, gap: 6, borderWidth: focus ? 2 : 1, borderColor: focus ? t.accent : t.line }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: t.ink }}>{h.title}</Text>
                {focus ? <View style={{ borderRadius: 999, backgroundColor: t.accent, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ fontFamily: fonts.bold, fontSize: 10, color: '#14181F' }}>FOCUS</Text></View> : null}
              </Row>
              <Row style={{ alignItems: 'baseline', gap: 2 }}>
                <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: t.ink }}>{locked ? '••' : h.score}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: t.soft }}>/25</Text>
              </Row>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: t.line, overflow: 'hidden' }}>
                <View style={{ width: `${locked ? 0 : (h.score / 25) * 100}%`, height: 6, backgroundColor: focus ? t.accent : t.ink }} />
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: t.soft }} numberOfLines={2}>{locked ? 'Unlock to see' : h.line}</Text>
            </Press>
          );
        })}
      </View>

      {/* one action */}
      <View style={{ borderRadius: 24, backgroundColor: t.tile2, padding: space.lg, gap: space.sm }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: t.accent }}>FOCUS THIS WEEK · {weakest.title.toUpperCase()}</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: t.ink }}>{locked ? 'Your personal focus appears with Pro.' : r.tip}</Text>
        <Press onPress={() => router.push(locked ? '/pro' : GO[weakest.key].href)} accessibilityLabel={GO[weakest.key].cta} style={{ alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 9 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#14181F' }}>{locked ? 'See Pro' : GO[weakest.key].cta}</Text>
        </Press>
      </View>

      <Press onPress={share} accessibilityLabel="Share my grade" style={{ borderRadius: 999, borderWidth: 1.5, borderColor: t.ink, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        <Icon name="share" size={18} color={t.ink} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: t.ink }}>Share my grade</Text>
      </Press>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11.5, color: t.soft, textAlign: 'center' }}>A+ 90 · A 80 · B+ 70 · B 60 · C 50 · Each habit is worth 25. Only the grade card is shared.</Text>
    </View>
  );
}

/** Month-end forecast: where this month is heading, labelled as an estimate. */
export function ForecastCard({ t, stats, locked }: { t: SeasonTheme; stats: Stats; locked: boolean }) {
  const dues = useSettings((s) => s.dueItems);
  const f = monthForecast(stats.txs, dues, Date.now());
  const pct = f.lastMonth ? Math.round(((f.forecast - f.lastMonth) / f.lastMonth) * 100) : null;
  const max = Math.max(1, f.forecast, f.lastMonth);
  const mask = (s: string) => (locked ? '••' : s);
  return (
    <View style={{ borderRadius: 24, backgroundColor: t.tile, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: t.line }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: t.accent }}>MONTH-END ESTIMATE</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: t.soft }}>{f.daysLeft} days to go</Text>
      </Row>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 34, color: t.ink }}>{mask(money(f.forecast))}</Text>
      <View style={{ gap: 6 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: t.line, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: `${(f.soFar / max) * 100}%`, backgroundColor: t.ink }} />
          <View style={{ width: `${((f.forecast - f.soFar) / max) * 100}%`, backgroundColor: t.accent }} />
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.line, width: `${(f.lastMonth / max) * 100}%` }} />
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: t.soft }}>{locked ? 'Spent so far, your usual pace and bills still due, added up.' : `${money(f.soFar)} so far · about ${money(f.daily)} a day · ${money(f.duesLeft)} in bills to come${pct !== null ? ` · ${pct <= 0 ? '' : '+'}${pct}% vs last month` : ''}`}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>An estimate from your own pattern, not a promise.</Text>
    </View>
  );
}
