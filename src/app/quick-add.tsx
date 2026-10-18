import React from 'react';
import { useRouter } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/ui';
import { AddExpenseForm } from '@/features/tracker/ui/AddExpenseForm';
import { quitIfQuickLaunch, finishQuickAdd } from '@/features/native/quickAdd';

/** Top-anchored drop-down panel: amount, what-for, Save. Opened by the Quick Settings tile / shortcut / widget. */
export default function QuickAdd() {
  const router = useRouter();
  const close = () => {
    if (quitIfQuickLaunch()) return finishQuickAdd();
    router.canGoBack() ? router.back() : router.replace('/');
  };
  return (
    <Sheet from="top" onClose={close}>
      <Text v="h2" accessibilityRole="header">Quick add</Text>
      <AddExpenseForm compact onDone={close} />
    </Sheet>
  );
}
