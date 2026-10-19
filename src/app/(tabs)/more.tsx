import React from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen, Header, Text, Card, Row, Chip, Enter } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space, hit } from '@/theme/tokens';
import { useT } from '@/i18n';
import { appConfig } from '@/config/app';
import { appVariant, isNativeAvailable, isExpoGo } from '@/features/native/module';
import { toast, ToastHost } from '@/components/Toast';

function Item({ title, sub, href, right }: { title: string; sub?: string; href?: Href; right?: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={href ? 'button' : 'none'}
      onPress={href ? () => router.push(href) : undefined}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.7 : 1 })}
    >
      <View style={{ flex: 1 }}>
        <Text v="title">{title}</Text>
        {sub ? <Text v="small" color={colors.textMuted}>{sub}</Text> : null}
      </View>
      {right ?? (href ? <Icon name="chevron" color={colors.textMuted} size={20} /> : null)}
    </Pressable>
  );
}

export default function More() {
  const db = useDb();
  const t = useT();
  const s = useSettings();
  const { colors } = useTheme();

  async function toggleLock(v: boolean) {
    if (v) {
      const ok = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!ok) return toast('Set up a fingerprint, face or screen lock on your phone first.');
    }
    await s.set(db, 'biometricLock', v);
  }

  return (
    <Screen>
      <Header title={t('settings.title')} subtitle={`${appConfig.appName} · ${appVariant}${isExpoGo ? ' · Expo Go' : ''}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }}>
        <Enter i={0}>
          <Card>
            <Text v="caps" color={colors.textMuted}>MONEY</Text>
            <Item title="Budgets" sub="Monthly and per-category limits with alerts" href="/budgets" />
            <Item title="Categories" sub="Add or edit icons and colours" href="/settings/categories" />
            <Item title="Accounts" sub="Cash, bank, UPI, cards, wallets" href="/settings/accounts" />
            <Item title="Recurring" sub="Rent, subscriptions, SIPs" href="/settings/recurring" />
          </Card>
        </Enter>
        <Enter i={1}>
          <Card>
            <Text v="caps" color={colors.textMuted}>QUICK CAPTURE</Text>
            <Item title={appVariant === 'full' ? 'Bank & UPI messages' : 'Import from a message'} sub={appVariant === 'full' ? 'Turn texts into expenses, on your phone only' : 'Paste or share a bank SMS: done in two seconds'} href="/settings/capture" />
            <Item title="Quick add" sub="Add an expense in about 3 seconds" href="/settings/quick-add" />
          </Card>
        </Enter>
        <Enter i={2}>
          <Card>
            <Text v="caps" color={colors.textMuted}>PREFERENCES</Text>
            <Item title="Dark mode" sub={`Currently: ${s.theme}`} right={
              <Row>{(['system', 'light', 'dark'] as const).map((m) => <Chip key={m} label={m} selected={s.theme === m} onPress={() => s.set(db, 'theme', m)} />)}</Row>
            } />
            <Item title={t('settings.language')} right={
              <Row><Chip label="English" selected={s.lang === 'en'} onPress={() => s.set(db, 'lang', 'en')} /><Chip label="हिन्दी" selected={s.lang === 'hi'} onPress={() => s.set(db, 'lang', 'hi')} /></Row>
            } />
            <Item title="App lock" sub="Fingerprint, face or screen lock" right={<Switch accessibilityLabel="App lock" value={s.biometricLock} onValueChange={toggleLock} trackColor={{ true: colors.primary }} />} />
            <Item title="Haptics" right={<Switch accessibilityLabel="Haptics" value={s.hapticsEnabled} onValueChange={(v) => s.set(db, 'hapticsEnabled', v)} trackColor={{ true: colors.primary }} />} />
          </Card>
        </Enter>
        <Enter i={3}>
          <Card>
            <Text v="caps" color={colors.textMuted}>YOUR DATA</Text>
            <Item title="Export & backup" sub="CSV, full backup file, restore" href="/settings/data" />
            <Item title="Privacy" sub="What stays on your phone" href="/settings/privacy" />
            <Item title={t('settings.developer')} sub="Demo data and a message simulator for trying things out" href="/settings/developer" />
          </Card>
        </Enter>
      </ScrollView>
      <ToastHost />
    </Screen>
  );
}
