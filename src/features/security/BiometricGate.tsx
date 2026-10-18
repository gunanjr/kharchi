import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '@/store/settings';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Locks the app behind device biometrics / PIN when enabled. Fails open if hardware is unavailable. */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const enabled = useSettings((s) => s.biometricLock);
  const { colors } = useTheme();
  const [locked, setLocked] = useState(enabled);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) return setLocked(false);
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock', cancelLabel: 'Cancel' });
      if (r.success) setLocked(false);
    } catch {
      setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (enabled && locked) unlock();
  }, [enabled, locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' && enabled) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  if (enabled && locked)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl }}>
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text v="h1">Locked</Text>
        <Button title="Unlock" onPress={unlock} />
      </View>
    );
  return <>{children}</>;
}
