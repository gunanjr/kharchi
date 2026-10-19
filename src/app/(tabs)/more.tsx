import React from 'react';
import { ScrollView, Share, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen, Header, Enter, Group, ListRow, IconTile, Segmented, Text, Row, Swatch, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { usePlus } from '@/features/entitlements/usePlus';
import { ACCENTS, type AccentKey } from '@/theme/tokens';
import type { IconName } from '@/components/Icon';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space, layout } from '@/theme/tokens';
import { useT } from '@/i18n';
import { appConfig } from '@/config/app';
import { appVariant, isExpoGo } from '@/features/native/module';
import { toast, ToastHost } from '@/components/Toast';

export default function More() {
  const db = useDb();
  const t = useT();
  const s = useSettings();
  const { colors } = useTheme();
  const router = useRouter();
  const plus = usePlus();
  const item = (title: string, sub: string | undefined, icon: IconName, href: Href) => (
    <ListRow title={title} sub={sub} leading={<IconTile icon={icon} size={40} />} onPress={() => router.push(href)} />
  );

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.xl, paddingBottom: 168 }}>
        <Enter i={0}>
          <Press accessibilityLabel="Kharchi Plus" onPress={() => router.push('/plus')} style={{ backgroundColor: colors.primary, borderRadius: 24, borderCurve: 'continuous' as any, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconTile tone="ink" size={44} icon="ribbon" />
            <View style={{ flex: 1 }}>
              <Text v="title" color={colors.onPrimary}>{plus.isPlus ? 'Kharchi Plus is on' : 'Kharchi Plus'}</Text>
              <Text v="small" color={colors.onPrimary} style={{ opacity: 0.8 }}>{plus.isPlus ? 'Every Plus feature is unlocked' : 'Unlimited goals, health score, receipts and more'}</Text>
            </View>
            <Icon name="chevron" color={colors.onPrimary} size={20} />
          </Press>
        </Enter>
        <Enter i={0}>
          <Group title="Money">
            {item('Goals', 'Save for a trip, a phone or a rainy day', 'target', '/goals')}
            {item('Monthly review', 'Your month in one card', 'chart', '/review')}
            {item('Budgets', 'Monthly and per-category limits with alerts', 'target', '/budgets')}
            {item('Categories', 'Add or edit icons and colours', 'tag', '/settings/categories')}
            {item('Accounts', 'Cash, bank, UPI, cards, wallets', 'wallet', '/settings/accounts')}
            {item('Recurring', 'Rent, subscriptions, SIPs', 'repeat', '/settings/recurring')}
          </Group>
        </Enter>
        <Enter i={1}>
          <Group title="Quick capture">
            {item(appVariant === 'full' ? 'Bank & UPI messages' : 'Import from a message', appVariant === 'full' ? 'Turn texts into expenses, on your phone only' : 'Paste or share a bank SMS: done in two seconds', 'chat', '/settings/capture')}
            {item('Say an expense', 'Dictate with your keyboard, review, save', 'chat', '/voice')}
            {item('Saved bills', 'Scanned bills waiting to be split', 'scan', '/bills')}
            {item('Widgets & shortcuts', 'Quick add and Scan bill on your home screen', 'bolt', '/settings/quick-add')}
          </Group>
        </Enter>
        <Enter i={2}>
          <Group title="Preferences">
            <ListRow title="Appearance" sub={`Currently: ${s.theme}`} leading={<IconTile icon="moon" size={40} />} />
            <View style={{ paddingBottom: space.md }}><Segmented options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} value={s.theme} onChange={(m) => s.set(db, 'theme', m)} /></View>
            <ListRow title={t('settings.language')} leading={<IconTile icon="language" size={40} />} />
            <View style={{ paddingBottom: space.md }}><Segmented options={[{ key: 'en', label: 'English' }, { key: 'hi', label: 'हिन्दी' }]} value={s.lang} onChange={(m) => s.set(db, 'lang', m)} /></View>
            <ListRow title="Accent colour" sub={plus.isPlus ? ACCENTS[s.accent].label : 'Plus feature'} leading={<IconTile icon="palette" size={40} />} right={plus.isPlus ? undefined : <Icon name="lock" color={colors.textSubtle} size={18} />} />
            <Row style={{ paddingBottom: space.md, flexWrap: 'wrap' }}>
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                <Swatch key={k} color={ACCENTS[k].light.fill} selected={(plus.isPlus ? s.accent : 'marigold') === k}
                  onPress={() => { if (!plus.has('accent_themes')) { toast('Accent colours are a Plus feature'); return router.push('/plus'); } s.set(db, 'accent', k); }} />
              ))}
            </Row>
            <ListRow title="App lock" sub="Fingerprint, face or screen lock" leading={<IconTile icon="lock" size={40} />} right={<Switch accessibilityLabel="App lock" value={s.biometricLock} onValueChange={toggleLock} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" />} />
            <ListRow title="Haptics" leading={<IconTile icon="vibrate" size={40} />} right={<Switch accessibilityLabel="Haptics" value={s.hapticsEnabled} onValueChange={(v) => s.set(db, 'hapticsEnabled', v)} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" />} />
          </Group>
        </Enter>
        <Enter i={3}>
          <Group title="Spread the word">
            <ListRow title="Share Kharchi" sub="Tell a friend about a private expense tracker" leading={<IconTile icon="share" size={40} />} onPress={() => Share.share({ message: `I use ${appConfig.appName} to track spending and split bills. It keeps everything on my phone: no account, no ads, no tracking.` })} />
            {item('Help and feedback', 'Report a problem, share an idea, quick answers', 'mail', '/feedback')}
          </Group>
        </Enter>
        <Enter i={4}>
          <Group title="Your data">
            {item('Export & backup', 'CSV, full backup file, restore', 'download', '/settings/data')}
            {item('Privacy', 'What stays on your phone', 'shield', '/settings/privacy')}
            {item(t('settings.developer'), 'Demo data and a message simulator for trying things out', 'code', '/settings/developer')}
          </Group>
        </Enter>
      </ScrollView>
      <ToastHost />
    </Screen>
  );
}
