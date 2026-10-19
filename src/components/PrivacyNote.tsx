import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Text, Press, IconTile } from './ui';
import { Icon } from './Icon';
import { appConfig } from '@/config/app';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/**
 * A plain statement of how data is handled, shown at the foot of Home. Every sentence is a fact about this app: there is
 * no account and no server, so the people who make it cannot see entries. The store build also has no internet permission.
 */
export function PrivacyNote() {
  const router = useRouter();
  const { colors } = useTheme();
  const store = !!Constants.expoConfig?.extra?.storeBuild;
  return (
    <View style={{ paddingHorizontal: layout.gutter }}>
      <Press accessibilityLabel="How your data is kept private" onPress={() => router.push('/settings/privacy')} scale={0.99}
        style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
        <IconTile icon="lock" size={40} tone="plain" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text v="title">Only you can see this</Text>
          <Text v="small" color={colors.textMuted}>
            Your entries stay on this phone. {appConfig.appName} has no account and no server{store ? ', and this version of the app cannot even connect to the internet' : ''}, so the people who make it cannot see your money. Only what you choose to send us, like feedback, ever leaves your phone.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>How it works</Text>
            <Icon name="chevron" color={colors.link} size={14} />
          </View>
        </View>
      </Press>
    </View>
  );
}
