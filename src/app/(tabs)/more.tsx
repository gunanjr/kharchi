import React from 'react';
import { ScrollView, Share, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { Screen, Header, Enter, Group, ListRow, IconTile, Segmented, Row, Swatch, Text, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useIsPro } from '@/features/pro/store';
import { showPro } from '@/features/pro/flags';
import { BrandMark, Wordmark } from '@/components/Wordmark';
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
  const isPro = useIsPro();
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
      <Header title={t('settings.title')} subtitle={`${appConfig.appName}${isExpoGo ? ' · Expo Go' : ''}`} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.xl, paddingBottom: 168 }}>
        {showPro() ? <Enter i={0}>
          <Card onPress={() => router.push('/pro')} accessibilityLabel="BruhMe Pro" tone="ink" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <BrandMark size={40} />
            <View style={{ flex: 1 }}>
              <Text v="title" color={colors.onHero}>BruhMe Pro</Text>
              <Text v="small" color={colors.onHeroMuted}>{isPro ? 'Pro is on' : 'Vault, radar, due dates, deeper Insights and more'}</Text>
            </View>
            <Icon name="chevron" size={18} color={colors.onHeroMuted} />
          </Card>
        </Enter> : null}
        <Enter i={0}>
          <Group title="Money">
            {item('Goals', 'Save for a trip, a phone or a rainy day', 'target', '/goals')}
            {item('Monthly review', 'Your month in one card', 'chart', '/review')}
            {item('Budgets', 'Set a monthly limit and see how close you are', 'target', '/budgets')}
            {item('Categories', 'Add or edit icons and colours', 'tag', '/settings/categories')}
            {item('Accounts', 'Cash, bank, UPI, cards, wallets', 'wallet', '/settings/accounts')}
            {item('Recurring', 'Rent, subscriptions, SIPs', 'repeat', '/settings/recurring')}
            {showPro() ? item('Due dates', 'Card, rent, EMI and bills with reminders (Pro)', 'calendar', '/dues') : null}
            {showPro() ? item('Subscription radar', 'Every repeating charge, renewals and price rises (Pro)', 'repeat', '/radar') : null}
          </Group>
        </Enter>
        <Enter i={1}>
          <Group title="Quick capture">
            {item(appVariant === 'full' ? 'Bank & UPI messages' : 'Import from a message', appVariant === 'full' ? 'Turn texts into expenses, on your phone only' : 'Paste or share a bank SMS: done in two seconds', 'chat', '/settings/capture')}
            {item('Say an expense', 'Tap the mic on your keyboard, say it, check, save', 'chat', '/voice')}
            {item('Saved bills', 'Scanned bills waiting to be split', 'scan', '/bills')}
            {item('Widgets & shortcuts', 'Quick add and Scan bill on your home screen', 'bolt', '/settings/quick-add')}
          </Group>
        </Enter>
        <Enter i={2}>
          <Group title="Preferences">
            <ListRow title="Appearance" sub={s.theme === 'system' ? 'Follows your phone’s light or dark mode' : s.theme === 'dark' ? 'Dark, easy on the eyes at night' : 'Light, always'} leading={<IconTile icon="moon" size={40} />} />
            <View style={{ paddingBottom: space.md }}><Segmented options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} value={s.theme} onChange={(m) => s.set(db, 'theme', m)} /></View>
            <ListRow title="Accent colour" sub={`${ACCENTS[s.accent].label} · the colour of buttons and highlights`} leading={<IconTile icon="palette" size={40} />} />
            <Row style={{ paddingBottom: space.md, flexWrap: 'wrap' }}>
              {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                <Swatch key={k} color={ACCENTS[k].light.fill} selected={s.accent === k}
                  onPress={() => s.set(db, 'accent', k)} />
              ))}
            </Row>
            <ListRow title="App lock" sub="Ask for your fingerprint, face or screen lock when BruhMe opens" leading={<IconTile icon="lock" size={40} />} right={<Switch accessibilityLabel="App lock" value={s.biometricLock} onValueChange={toggleLock} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" />} />
            <ListRow title="Haptics" sub="Small buzzes when you tap, save or settle, so you feel it worked" leading={<IconTile icon="vibrate" size={40} />} right={<Switch accessibilityLabel="Haptics" value={s.hapticsEnabled} onValueChange={(v) => s.set(db, 'hapticsEnabled', v)} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" />} />
          </Group>
        </Enter>
        <Enter i={3}>
          <Group title="Spread the word">
            <ListRow title={`Share ${appConfig.appName}`} sub="Send it to someone who splits costs with you" leading={<IconTile icon="share" size={40} />} onPress={() => Share.share({ message: `I use ${appConfig.appName} to track spending and split bills. It keeps everything on my phone: no account, no ads, no tracking.` })} />
            {item('Help and feedback', 'Report a problem, share an idea, quick answers', 'mail', '/feedback')}
          </Group>
        </Enter>
        <Enter i={4}>
          <Group title="Your data">
            {showPro() ? item('Vault', 'Automatic encrypted backups to your own Drive (Pro)', 'lock', '/settings/vault') : null}
            {item('Export & backup', 'Save a copy, move to a new phone, or open in Excel', 'download', '/settings/data')}
            {item('Privacy', 'What stays on your phone', 'shield', '/settings/privacy')}
            {item(t('settings.developer'), 'Demo data and a message simulator for trying things out', 'code', '/settings/developer')}
          </Group>
        </Enter>
        <Enter i={5}>
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: space.xl }}>
            <BrandMark size={52} />
            <Wordmark height={26} />
            <Text v="small" color={colors.textSubtle}>Version {Constants.expoConfig?.version ?? '1.0.0'} · your records stay on this phone</Text>
          </View>
        </Enter>
      </ScrollView>
      <ToastHost />
    </Screen>
  );
}
