import React, { useEffect, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { SubScreen, Card, Text, Button, Row, Press, Field } from '@/components/ui';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { newFriendCode, parseFriendCode } from '@/features/referral/referral';
import { Icon, type IconName } from '@/components/Icon';
import { ToastHost, toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { PRODUCTS, type ProductId } from '@/features/pro/entitlement';
import { manageSubscription, purchasePro, restorePurchases } from '@/features/pro/billing';
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
  ['lock', 'Vault', 'Automatic encrypted backups to your own Drive or folder, with a recovery code'],
  ['repeat', 'Subscription radar', 'Every repeating charge, renewal reminders and price rises'],
  ['calendar', 'Due dates', 'Card, rent, EMI and bill reminders so you never pay late'],
  ['chart', 'Deep dive and 1-year Insights', 'Spending calendar, compare months, budgets from your history'],
  ['ribbon', 'Wrapped and badges', 'Monthly and yearly story cards and milestones to share'],
  ['send', 'Bump Pro', 'All 8 tones, your own lines, card themes and stickers'],
  ['wallet', 'Spaces', 'Side hustle, home, trips and events kept apart'],
  ['person', 'Your money profile', 'Persona, streaks, Bruh score and Roast or toast'],
  ['receipt', 'Reimbursements', 'Work spends as a PDF claim with receipts'],
  ['shield', 'Warranties and tax totals', 'Warranty reminders and yearly totals for your CA'],
  ['eyeOff', 'Private mode', 'Hide chosen entries behind your fingerprint'],
];

/** The Pro screen. Prices, renewal and cancellation are stated plainly before any purchase; no timers, no tricks. */
export default function Pro() {
  const { colors } = useTheme();
  const pro = useIsPro();
  const [plan, setPlan] = useState<ProductId>(PRODUCTS.yearly);
  const [busy, setBusy] = useState(false);
  const db = useDb();
  const myCode = useSettings((s) => s.friendCode);
  const offer = useSettings((s) => s.friendOffer);
  const setSetting = useSettings((s) => s.set);
  const [codeText, setCodeText] = useState('');
  useEffect(() => { if (!myCode) setSetting(db, 'friendCode', newFriendCode((n) => Crypto.getRandomBytes(n))); }, [myCode, db, setSetting]);
  async function applyCode() {
    const r = parseFriendCode(codeText, myCode);
    if (!r.ok) return toast(r.why);
    await setSetting(db, 'friendOffer', r.code);
    toast('Friend code applied');
  }
  async function shareCode() {
    try {
      await Share.share({ message: `I use BruhMe to track spending and split bills. Use my code ${myCode} to get 30% off BruhMe Pro for your first year.` });
      if (!useSettings.getState().sharedCode) { await setSetting(db, 'sharedCode', true); toast('Thanks for sharing! OG Bruh badge and stickers unlocked.'); }
    } catch { /* closed the share sheet */ }
  }

  async function buy() {
    setBusy(true);
    const r = await purchasePro(plan, { friendCode: offer || undefined });
    setBusy(false);
    if (r === 'purchased') toast('Welcome to BruhMe Pro 🎉');
    else if (r === 'unavailable') toast('Purchases work in the BruhMe app from Google Play, not in this test build.');
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

      <Card style={{ gap: space.md }}>
        {offer ? (
          <Text v="small" color={colors.income} style={{ fontFamily: fonts.semibold }}>Friend code {offer} applied: 30% off your first year (₹699 instead of ₹999), shown by Google Play at checkout.</Text>
        ) : (
          <>
            <Text v="title">Have a friend code?</Text>
            <Row style={{ gap: space.sm }}>
              <View style={{ flex: 1 }}><Field value={codeText} onChangeText={setCodeText} placeholder="BRUH-7Q4K" autoCapitalize="characters" autoCorrect={false} /></View>
              <Button title="Apply" kind="secondary" size="sm" disabled={!codeText.trim()} onPress={applyCode} />
            </Row>
          </>
        )}
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text v="small" color={colors.textMuted}>Your code</Text>
            <Text v="title">{myCode || '…'}</Text>
          </View>
          <Button title="Share" icon="share" size="sm" kind="secondary" onPress={shareCode} disabled={!myCode} />
        </Row>
        <Text v="small" color={colors.textMuted}>Friends who use your code get 30% off their first year. You get the OG Bruh badge and an exclusive sticker pack.</Text>
      </Card>

      <Row style={{ justifyContent: 'center', gap: space.lg }}>
        <Button title="Restore purchases" kind="ghost" size="sm" onPress={restore} />
        {pro ? <Button title="Manage subscription" kind="ghost" size="sm" onPress={manageSubscription} /> : null}
        <Button title="Privacy" kind="ghost" size="sm" onPress={() => Linking.openURL(appConfig.privacyPolicyUrl).catch(() => {})} />
      </Row>
      <ToastHost />
    </SubScreen>
  );
}
