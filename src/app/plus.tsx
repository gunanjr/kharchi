import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Enter, Group, ListRow, IconTile, Tag, Segmented, Money, SectionHeader } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { ToastHost, toast } from '@/components/Toast';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { PLUS_PERKS } from '@/features/entitlements';
import { COMPARISON, PRICING, perMonthOf, priceLabel, yearlySavingPct, type Billing } from '@/features/entitlements/pricing';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

function Cell({ v, on }: { v: string | boolean; on?: boolean }) {
  const { colors } = useTheme();
  if (v === true) return <Icon name="check" color={on ? colors.income : colors.textMuted} size={18} />;
  if (v === false) return <Text v="small" color={colors.textSubtle}>None</Text>;
  return <Text v="small" color={on ? colors.text : colors.textMuted} style={{ textAlign: 'right' }}>{v}</Text>;
}

export default function Plus() {
  const db = useDb();
  const { colors } = useTheme();
  const plus = useSettings((s) => s.plusPreview);
  const waitlist = useSettings((s) => s.plusWaitlist);
  const set = useSettings((s) => s.set);
  const [billing, setBilling] = useState<Billing>('yearly');

  async function join() {
    await set(db, 'plusWaitlist', billing);
    toast('You are on the list. We will tell you in the app when Plus opens.');
  }

  return (
    <SubScreen title="Kharchi Plus">
      <Enter>
        <Card tone="ink" style={{ gap: space.md, paddingVertical: space.xl }}>
          <Tag label={plus ? 'Preview on' : 'Coming soon'} tone={plus ? 'income' : 'primary'} />
          <Text v="h1" color={colors.onHero}>More room for your money</Text>
          <Text color={colors.onHeroMuted}>Everything you use today stays free. Plus adds longer history, unlimited goals and a few finishing touches.</Text>
        </Card>
      </Enter>

      <Enter i={1}>
        <Card style={{ gap: space.md }}>
          <Segmented options={[{ key: 'monthly', label: 'Monthly' }, { key: 'yearly', label: `Yearly · save ${yearlySavingPct()}%` }]} value={billing} onChange={setBilling} />
          <View style={{ alignItems: 'flex-start', gap: 2 }}>
            <Money size="xl" text={formatMoney(perMonthOf(billing), PRICING.currency, { trimZeros: true })} />
            <Text v="small" color={colors.textMuted}>a month{billing === 'yearly' ? `, billed ${priceLabel('yearly')}` : ', cancel any time'}</Text>
          </View>
          {waitlist ? (
            <View style={{ backgroundColor: colors.incomeSoft, borderRadius: 16, padding: space.md }}>
              <Text v="small" color={colors.income}>You are on the {waitlist} waitlist. Nothing has been charged and nothing needs doing.</Text>
            </View>
          ) : (
            <Button title="Join the Plus waitlist" kind="accent" onPress={join} />
          )}
          <Text v="small" color={colors.textSubtle}>Payments are not open yet, so there is nothing to buy today. Prices shown are the planned launch prices.</Text>
        </Card>
      </Enter>

      <Enter i={2}>
        <SectionHeader title="Free and Plus side by side" />
        <Card pad={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs, marginTop: space.sm }}>
          <Row style={{ paddingVertical: space.md, gap: space.sm }}>
            <Text v="caps" color={colors.textMuted} style={{ flex: 1 }}> </Text>
            <Text v="caps" color={colors.textMuted} style={{ width: 92, textAlign: 'right' }}>FREE</Text>
            <Text v="caps" color={colors.link} style={{ width: 92, textAlign: 'right' }}>PLUS</Text>
          </Row>
          {COMPARISON.map((r) => (
            <Row key={r.label} style={{ paddingVertical: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
              <Text v="small" style={{ flex: 1 }}>{r.label}</Text>
              <View style={{ width: 92, alignItems: 'flex-end' }}><Cell v={r.free} /></View>
              <View style={{ width: 92, alignItems: 'flex-end' }}><Cell v={r.plus} on /></View>
            </Row>
          ))}
        </Card>
      </Enter>

      <Enter i={3}>
        <Group title="What Plus adds">
          {PLUS_PERKS.map((p) => (
            <ListRow key={p.feature} title={p.title} sub={p.body} leading={<IconTile icon={p.icon as IconName} size={40} tone="solid" color={colors.primary} />} right={plus ? <Icon name="check" color={colors.income} size={20} /> : <Icon name="lock" color={colors.textSubtle} size={18} />} />
          ))}
        </Group>
      </Enter>

      <Enter i={4}>
        <Card style={{ gap: space.xs }}>
          <Row style={{ justifyContent: 'space-between', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text v="title">Try Plus features on this phone</Text>
              <Text v="small" color={colors.textMuted}>For testing and review. It unlocks the Plus features without any payment.</Text>
            </View>
            <Switch accessibilityLabel="Try Plus features" value={plus} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff"
              onValueChange={async (v) => { await set(db, 'plusPreview', v); toast(v ? 'Plus features are on' : 'Plus features are off'); }} />
          </Row>
        </Card>
      </Enter>

      <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>
        Your entries stay on your phone with or without Plus. No account, no ads, no tracking.
      </Text>
      <ToastHost />
    </SubScreen>
  );
}
