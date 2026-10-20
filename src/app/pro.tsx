import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { SubScreen, Card, Text, Button, Row, Press } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { ToastHost, toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { PRODUCTS, type ProductId } from '@/features/pro/entitlement';
import { purchasePro, restorePurchases } from '@/features/pro/billing';
import { useIsPro } from '@/features/pro/store';
import { appConfig } from '@/config/app';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const PLANS: { id: ProductId; name: string; price: string; per: string; note?: string; badge?: string }[] = [
  { id: PRODUCTS.yearly, name: 'Yearly', price: '₹999', per: 'a year', note: 'about ₹83 a month · 7 days free', badge: 'Best value' },
  { id: PRODUCTS.monthly, name: 'Monthly', price: '₹129', per: 'a month' },
  { id: PRODUCTS.lifetime, name: 'Lifetime', price: '₹2,999', per: 'once', note: 'pay once, keep Pro' },
];

// Only features that exist in this build are listed: never sell something that is not there yet (Play policy).
const PERKS: [IconName, string, string][] = [
  ['lock', 'Vault', 'Automatic encrypted backups to your own Google Drive or folder'],
  ['shield', 'Recovery code', 'Restore everything on a new phone, no password to remember'],
  ['repeat', 'Always up to date', 'Saved whenever something changes, last 7 versions kept'],
];

/** The Pro screen. Prices, renewal and cancellation are stated plainly before any purchase; no timers, no tricks. */
export default function Pro() {
  const { colors } = useTheme();
  const pro = useIsPro();
  const [plan, setPlan] = useState<ProductId>(PRODUCTS.yearly);
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    const r = await purchasePro(plan);
    setBusy(false);
    if (r === 'unavailable') toast('Purchases work in the BruhMe app from Google Play, not in this test build.');
    else if (r === 'pending') toast('Payment pending. Pro turns on when Google Play confirms it.');
    else if (r === 'error') toast('Google Play could not complete the purchase. You were not charged.');
  }
  async function restore() {
    const r = await restorePurchases();
    toast(r === 'restored' ? 'Pro restored' : r === 'none' ? 'No Pro purchase found on this Google account' : 'Restoring works in the BruhMe app from Google Play.');
  }

  return (
    <SubScreen title="BruhMe Pro">
      <Card tone="ink" style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
        <BrandMark size={56} />
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: colors.onHero }}>BruhMe <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: colors.primary }}>Pro</Text></Text>
        <Text v="small" color={colors.onHeroMuted} style={{ textAlign: 'center' }}>{pro ? 'Pro is on. Thank you for backing BruhMe.' : 'Everything in BruhMe, plus the features that save you time and money every week.'}</Text>
      </Card>

      <Card style={{ gap: space.md }}>
        {PERKS.map(([icon, t, d]) => (
          <Row key={t} style={{ gap: space.md, alignItems: 'flex-start' }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={17} color={colors.link} /></View>
            <View style={{ flex: 1 }}><Text v="title">{t}</Text><Text v="small" color={colors.textMuted}>{d}</Text></View>
          </Row>
        ))}
      </Card>

      {!pro ? (
        <>
          <View style={{ gap: space.sm }}>
            {PLANS.map((p) => {
              const on = plan === p.id;
              return (
                <Press key={p.id} onPress={() => setPlan(p.id)} accessibilityLabel={`${p.name}, ${p.price} ${p.per}`} accessibilityState={{ selected: on }}
                  style={{ borderRadius: 20, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border, backgroundColor: colors.surface, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.primary : colors.textSubtle, alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Row style={{ gap: space.sm }}>
                      <Text v="title">{p.name}</Text>
                      {p.badge ? <View style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text v="small" color={colors.link} style={{ fontSize: 11, fontFamily: fonts.semibold }}>{p.badge}</Text></View> : null}
                    </Row>
                    {p.note ? <Text v="small" color={colors.textMuted}>{p.note}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}><Text v="title">{p.price}</Text><Text v="small" color={colors.textMuted}>{p.per}</Text></View>
                </Press>
              );
            })}
          </View>
          <Button title={plan === PRODUCTS.yearly ? 'Start 7-day free trial' : plan === PRODUCTS.lifetime ? 'Buy Lifetime' : 'Subscribe monthly'} kind="accent" onPress={buy} loading={busy} />
          <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>
            {plan === PRODUCTS.lifetime ? 'One payment through Google Play. Pro stays on this Google account.' : `${plan === PRODUCTS.yearly ? 'Free for 7 days, then ₹999 a year' : '₹129 a month'}. Renews automatically until you cancel. Cancel any time in Google Play, Subscriptions.`}
          </Text>
        </>
      ) : null}

      <Row style={{ justifyContent: 'center', gap: space.lg }}>
        <Button title="Restore purchases" kind="ghost" size="sm" onPress={restore} />
        <Button title="Privacy" kind="ghost" size="sm" onPress={() => Linking.openURL(appConfig.privacyPolicyUrl).catch(() => {})} />
      </Row>
      <ToastHost />
    </SubScreen>
  );
}
