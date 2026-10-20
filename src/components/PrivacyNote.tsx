import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Text, Press, IconTile } from './ui';
import { Icon } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/**
 * Foot of Home. Short, in the app's voice, and every line is a fact about this build: no account, no server, entries
 * are kept on the phone, and nothing leaves unless the user exports or shares it. (The store build also has no internet
 * permission.) No absolute claims such as "unhackable".
 */
export function PrivacyNote() {
  const router = useRouter();
  const { colors } = useTheme();
  const store = !!Constants.expoConfig?.extra?.storeBuild;
  return (
    <View style={{ paddingHorizontal: layout.gutter }}>
      <Press accessibilityLabel="How your data is stored" onPress={() => router.push('/settings/privacy')} scale={0.99}
        style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile icon="lock" size={40} tone="plain" />
          <Text v="h3" style={{ flex: 1 }}>
            Your money, <Text v="h3" color={colors.link}>your phone.</Text>
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          {[
            ['No account', 'no sign-up, no login, nobody to hand your details to.'],
            ['No server', `we don’t run one, so there’s nothing to send your entries to${store ? ' (this build can’t even use the internet)' : ''}.`],
            ['You decide', 'export, share or email something and it goes exactly where you pick.'],
          ].map(([k, v]) => (
            <Text key={k} v="small" color={colors.textMuted}>
              <Text v="small" style={{ fontFamily: 'Geist_700Bold' }}>{k}</Text>
              {` · ${v}`}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>See how it works</Text>
          <Icon name="chevron" color={colors.link} size={14} />
        </View>
      </Press>
    </View>
  );
}
