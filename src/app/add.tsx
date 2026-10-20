import React from 'react';
import { useRouter } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Text, Row, Button } from '@/components/ui';
import { AddExpenseForm } from '@/features/tracker/ui/AddExpenseForm';
import { useT } from '@/i18n';

export default function AddModal() {
  const router = useRouter();
  const t = useT();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Sheet onClose={close}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text v="h2" accessibilityRole="header">{t('add.title')}</Text>
        <Button title="Say it" kind="secondary" size="sm" icon="chat" onPress={() => router.replace('/voice')} />
      </Row>
      <AddExpenseForm onDone={close} />
    </Sheet>
  );
}
