import React, { useRef } from 'react';
import { View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Text, Row, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { reportCard } from '@/features/pro/report';
import { monthForecast } from '@/features/pro/forecast';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { fonts, space } from '@/theme/tokens';
import type { useProStats } from '@/features/pro/widgets';
import type { SeasonTheme } from './theme';

type Stats = NonNullable<ReturnType<typeof useProStats>>;
const money = (n: number) => formatMoney(n, 'INR', { compact: true });

/** The month's report card: a big grade, four habit bars, one tip, shareable (no amounts on the card). */
export function ReportSection({ t, stats, locked }: { t: SeasonTheme; stats: Stats; locked: boolean }) {
  const dues = useSettings((s) => s.dueItems);
  const name = useSettings((s) => s.profileName);
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const now = Date.now();
  const d = new Date(now);
  const r = reportCard(stats.txs, dues, d.getFullYear(), d.getMonth(), now);
  const last = reportCard(stats.txs, dues, d.getFullYear(), d.getMonth() - 1, now);
  async function share() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }
  return (
    <View style={{ gap: space.md }}>
      <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
        <View style={{ borderRadius: 28, backgroundColor: t.accent, padding: space.lg, gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 6 }}><BrandMark size={22} /><Text style={{ fontFamily: fonts.brandBlack, fontSize: 14, color: '#14181F' }}>{name ? `${name}’s` : 'My'} {r.month} report</Text></Row>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: 'rgba(20,24,31,0.6)' }}>{r.days} days in</Text>
          </Row>
          <Row style={{ alignItems: 'flex-end', gap: space.md }}>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 96, lineHeight: 100, letterSpacing: -4, color: '#14181F' }}>{locked ? '?' : r.grade}</Text>
            <View style={{ paddingBottom: 14 }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: '#14181F' }}>{locked ? '••' : r.total}/100</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: 'rgba(20,24,31,0.65)' }}>Last month: {last.grade}</Text>
            </View>
          </Row>
          {r.habits.map((h) => (
            <View key={h.key} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#14181F' }}>{h.title}</Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: 'rgba(20,24,31,0.65)' }}>{locked ? 'Pro' : h.line}</Text>
              </Row>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(20,24,31,0.14)', overflow: 'hidden' }}>
                <View style={{ width: `${locked ? 0 : (h.score / 25) * 100}%`, height: 8, backgroundColor: '#14181F' }} />
              </View>
            </View>
          ))}
        </View>
      </ViewShot>
      <View style={{ borderRadius: 22, backgroundColor: t.tile, padding: space.lg, gap: 6, borderWidth: 1, borderColor: t.line }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: t.accent }}>ONE THING TO TRY</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: t.ink }}>{locked ? 'Your personal tip appears with Pro.' : r.tip}</Text>
      </View>
      {!locked ? (
        <Press onPress={share} accessibilityLabel="Share my report" style={{ borderRadius: 999, backgroundColor: t.ink, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Icon name="share" size={18} color="#14181F" />
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#14181F' }}>Share my report</Text>
        </Press>
      ) : null}
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
