import React from 'react';
import { Share, Switch, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { SubScreen, Enter, Group, ListRow, IconTile, Segmented, Row, Swatch, Text, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useIsPro } from '@/features/pro/store';
import { showPro } from '@/features/pro/flags';
import { BrandMark, Wordmark } from '@/components/Wordmark';
import { ACCENTS, type AccentKey } from '@/theme/tokens';
import type { IconName } from '@/components/Icon';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { useT } from '@/i18n';
import { appConfig } from '@/config/app';
import { appVariant } from '@/features/native/module';
import { toast, ToastHost } from '@/components/Toast';

/** Settings: preferences, capture, data. Opened from the gear on Home and the Pro tab; features live in the tabs. */
export default function Settings() {
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
    <SubScreen title={t('settings.title')}>
      <View style={{ gap: space.xl }}>
        {showPro() ? <Enter i={0}>
          <Card onPress={() => router.push('/pro')} accessibilityLabel="BruhMe Pro" tone="ink" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <BrandMark size={40} />
            <View style={{ flex: 1 }}>
              <Text v="title" color={colors.onHero}>{isPro ? 'Your membership' : 'BruhMe Pro'}</Text>
              <Text v="small" color={colors.onHeroMuted}>{isPro ? 'Your plan, restore and manage subscription' : 'Main Character Energy, Vault, Spaces and 10 more tools'}</Text>
            </View>
            <Icon name="chevron" size={18} color={colors.onHeroMuted} />
          </Card>
        </Enter> : null}
        <Enter i={0}>
          <Group title="Money">
            {item('Profile', 'Name, avatar and poster colour', 'person', '/me')}
            {item('Categories', 'Add or edit icons and colours', 'tag', '/settings/categories')}
            {item('Accounts', 'Cash, bank, UPI, cards, wallets', 'wallet', '/settings/accounts')}
            {item('Recurring', 'Rent, subscriptions, SIPs', 'repeat', '/settings/recurring')}
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
            {showPro() ? item('Vault', isPro ? 'Encrypted backups to a folder you pick' : 'Encrypted backups to a folder you pick (Pro)', 'lock', '/settings/vault') : null}
            {item('Export & backup', 'Save a copy, move to a new phone, or open in Excel', 'download', '/settings/data')}
            {item('Privacy', 'What stays on your phone', 'shield', '/settings/privacy')}
            {__DEV__ ? item(t('settings.developer'), 'Demo data and a message simulator for trying things out', 'code', '/settings/developer') : null}
          </Group>
        </Enter>
        <Enter i={5}>
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: space.xl }}>
            <BrandMark size={52} />
            <Wordmark height={26} />
            <Text v="small" color={colors.textSubtle}>Version {Constants.expoConfig?.version ?? '1.0.0'} · your records stay on this phone</Text>
          </View>
        </Enter>
      </View>
      <ToastHost />
    </SubScreen>
  );
}
