import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/ui';
import { AddExpenseForm } from '@/features/tracker/ui/AddExpenseForm';
import { finishQuickAdd } from '@/features/native/quickAdd';

/**
 * Top-anchored drop-down panel: amount, what-for, Save.
 * Opened either inside the app (Settings → Quick add → Try it) or from OUTSIDE it (tile, widget, shortcut,
 * launcher entry / phone gesture), which loads this route with `?src=ext` in the translucent QuickAddActivity.
 * In the external case "closing" must finish that activity so the user lands back where they were.
 */
export default function QuickAdd() {
  const router = useRouter();
  const { src } = useLocalSearchParams<{ src?: string }>();
  const external = !!src;
  const close = () => {
    if (external && finishQuickAdd()) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <Sheet from="top" onClose={close}>
      <Text v="h2" accessibilityRole="header">Quick add</Text>
      <AddExpenseForm compact onDone={close} />
    </Sheet>
  );
}
