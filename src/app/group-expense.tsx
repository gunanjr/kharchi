import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SubScreen, Text } from '@/components/ui';
import { GroupExpenseForm } from '@/features/groups/ui/ExpenseForm';
import { useQuery } from '@/db/provider';
import { getExpense, getGroup, groupMembers, listPeople } from '@/features/groups/repo';
import { ToastHost } from '@/components/Toast';
import { View } from 'react-native';
import { layout } from '@/theme/tokens';

export default function GroupExpenseScreen() {
  const { groupId, id } = useLocalSearchParams<{ groupId?: string; id?: string }>();
  const router = useRouter();
  const q = useQuery(async (db) => {
    const group = groupId ? await getGroup(db, groupId) : null;
    const members = groupId ? await groupMembers(db, groupId) : await listPeople(db);
    const existing = id ? await getExpense(db, id) : undefined;
    return { group, members, existing };
  }, [groupId, id]);
  if (!q.data) return <SubScreen title="Expense"><Text>Loading…</Text></SubScreen>;
  return (
    <SubScreen title={q.data.existing ? 'Edit expense' : q.data.group ? `Add to ${q.data.group.name}` : 'Split with friends'} scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: layout.gutter }}>
      <GroupExpenseForm
        key={q.data.existing?.id ?? 'new'}
        groupId={groupId ?? null}
        members={q.data.members}
        groupCurrency={q.data.group?.currency ?? 'INR'}
        existing={q.data.existing}
        onDone={() => router.back()}
      />
      </View>
      <ToastHost />
    </SubScreen>
  );
}
