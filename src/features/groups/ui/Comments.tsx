import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Card, Text, Row, Press, IconTile } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { addComment, ensureSelf, listComments } from '../repo';
import type { Person } from '@/domain/types';
import { formatDay, formatTime } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as T } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/** A small thread under a shared expense: who said what, and a box to reply. Stored locally with the expense. */
export function Comments({ expenseId, members }: { expenseId: string; members: Person[] }) {
  const db = useDb();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const q = useQuery(async (d) => ({ me: await ensureSelf(d), list: await listComments(d, expenseId) }), [expenseId]);
  const name = (id: string | null) => (id && id === q.data?.me.id ? 'You' : members.find((m) => m.id === id)?.name ?? 'Someone');

  async function send() {
    if (!text.trim() || !q.data) return;
    await addComment(db, expenseId, q.data.me.id, text);
    haptic.light();
    setText('');
    bumpData();
  }
  return (
    <Card style={{ gap: space.md }}>
      <Text v="caps" color={colors.textMuted}>COMMENTS</Text>
      {q.data?.list.length === 0 ? <Text v="small" color={colors.textMuted}>No comments yet. Add a note about this expense.</Text> : null}
      {q.data?.list.map((c) => (
        <Row key={c.id} style={{ alignItems: 'flex-start', gap: space.md }}>
          <IconTile size={36} tone="plain"><Text v="small" color={colors.link}>{name(c.person_id)[0]?.toUpperCase()}</Text></IconTile>
          <View style={{ flex: 1, gap: 2 }}>
            <Text v="small" color={colors.textMuted}>{name(c.person_id)} · {formatDay(c.created_at)} {formatTime(c.created_at)}</Text>
            <Text>{c.body}</Text>
          </View>
        </Row>
      ))}
      <Row style={{ gap: space.sm }}>
        <TextInput
          value={text} onChangeText={setText} onSubmitEditing={send} returnKeyType="send" placeholder="Write a comment" placeholderTextColor={colors.textSubtle} accessibilityLabel="Comment"
          style={[T.body, { flex: 1, minWidth: 0, color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, minHeight: 48, paddingHorizontal: space.lg }]}
        />
        <Press accessibilityLabel="Send comment" onPress={send} feedback="none" disabled={!text.trim()} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? colors.ink : colors.track, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" color={text.trim() ? colors.onInk : colors.textSubtle} size={20} />
        </Press>
      </Row>
    </Card>
  );
}
