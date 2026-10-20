import React from 'react';
import { View } from 'react-native';
import { ComingUp } from '@/features/profile/ComingUp';
import { useIsPro } from './store';
import { ProStrip } from './ProStrip';
import { useSettings } from '@/store/settings';
import { layout } from '@/theme/tokens';

/** Pro widgets the user pinned to Home (chosen on the Pro tab). Nothing for free users. */
export function HomePins() {
  const pro = useIsPro();
  const pins = useSettings((s) => s.proPins.home);
  if (!pro || !pins.length) return null;
  return (
    <>
      {pins.includes('comingUp') ? <ComingUp /> : null}
      {pins.some((id) => id !== 'aura' && id !== 'comingUp') ? <View style={{ paddingHorizontal: layout.gutter }}><ProStrip tab="home" exclude={['aura', 'comingUp']} title="Pinned" /></View> : null}
    </>
  );
}
