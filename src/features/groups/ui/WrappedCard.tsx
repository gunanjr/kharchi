import React from 'react';
import { View } from 'react-native';
import { Text, Row, Money } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { fonts } from '@/theme/tokens';
import type { Wrapped } from '../wrapped';

const POP = ['#FF8106', '#FF4F8B', '#7B4DFF', '#18B89A', '#FFC400'];

/** A fixed-look share card (always light-on-colour so it reads the same wherever it is posted). */
export function WrappedCard({ name, currency, w, period }: { name: string; currency: string; w: Wrapped; period: string }) {
  return (
    <View style={{ backgroundColor: '#212934', borderRadius: 28, padding: 22, gap: 18, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: '#FF8106', opacity: 0.22 }} />
      <View style={{ position: 'absolute', left: -40, bottom: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: '#7B4DFF', opacity: 0.2 }} />
      <View style={{ gap: 4 }}>
        <Text v="caps" color="#FF9433">{period.toUpperCase()} · WRAPPED</Text>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 32, lineHeight: 36, color: '#FFFFFF', letterSpacing: -1 }} numberOfLines={2}>{name}</Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text v="small" color="#B9C0CB">the group spent</Text>
        <Money size="xl" color="#FFFFFF" text={formatMoney(w.total, currency, { trimZeros: true })} />
        <Text v="small" color="#B9C0CB">across {w.count} {w.count === 1 ? 'expense' : 'expenses'}</Text>
      </View>
      <View style={{ gap: 10 }}>
        {w.awards.map((a, i) => (
          <Row key={a.key} style={{ gap: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: POP[i % POP.length], alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text v="caps" color="#B9C0CB">{a.title.toUpperCase()}</Text>
              <Text style={{ fontFamily: fonts.brand, fontSize: 18, color: '#FFFFFF' }} numberOfLines={1}>{a.who}</Text>
              <Text v="small" color="#B9C0CB" numberOfLines={1}>{a.detail}</Text>
            </View>
            <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 15, color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{formatMoney(a.amount, currency, { compact: true })}</Text>
          </Row>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: '#FFFFFF' }}>Bruh<Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: '#FF8106' }}>Me</Text></Text>
        <Text v="small" color="#B9C0CB">bro, pay me back</Text>
      </Row>
    </View>
  );
}
