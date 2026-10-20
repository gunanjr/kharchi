import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { Button, Field, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { parseRecoveryCode, VaultError } from '../crypto';

/** Asks for the Vault recovery code on a new phone, checking typos before trying the file. */
export function CodePrompt({ visible, onSubmit, onCancel, error }: { visible: boolean; onSubmit: (code: string) => void; onCancel: () => void; error?: string | null }) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [local, setLocal] = useState<string | null>(null);
  if (!visible) return null;
  const submit = () => {
    try {
      parseRecoveryCode(code);
      setLocal(null);
      onSubmit(code);
    } catch (e) {
      setLocal(e instanceof VaultError ? e.message : 'Check the code and try again.');
    }
  };
  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Sheet onClose={onCancel}>
        <View style={{ gap: space.lg, padding: space.lg }}>
          <View style={{ gap: 4 }}>
            <Text v="h2">Enter your recovery code</Text>
            <Text v="small" color={colors.textMuted}>It is the 27-character code you saved when you turned on Vault, like 7Q4K-M2XD-…. Capital letters and dashes are optional.</Text>
          </View>
          <Field label="Recovery code" value={code} onChangeText={(t) => { setCode(t); setLocal(null); }} autoCapitalize="characters" autoCorrect={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXX" returnKeyType="done" onSubmitEditing={submit} />
          {local || error ? <Text v="small" color={colors.expense}>{local ?? error}</Text> : null}
          <Button title="Open backup" onPress={submit} disabled={!code.trim()} />
          <Button title="Cancel" kind="ghost" onPress={onCancel} />
        </View>
      </Sheet>
    </Modal>
  );
}
