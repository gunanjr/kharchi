import React, { useState } from 'react';
import { Linking, Switch, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Field, Segmented, Group, ListRow, IconTile, Tag, SectionHeader } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { KIND_LABEL, MAX_LEN, MIN_LEN, THANKS, buildMail, listFeedback, markSent, removeFeedback, saveFeedback, type FeedbackKind } from '@/features/feedback/repo';
import { appInfo } from '@/features/feedback/appInfo';
import { appConfig } from '@/config/app';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const FAQ: [string, string][] = [
  ['Where is my data?', 'Only on this phone. There is no account and no server. Back up from More, Export and backup.'],
  ['How do I move to a new phone?', 'Create a full backup file on this phone, keep it somewhere safe, and restore it on the new phone from the same screen.'],
  ['Can anyone see my entries?', 'No. Nothing is uploaded. If you send us feedback, only the words you write are in the email.'],
  ['How do I delete everything?', 'More, Export and backup, Delete all my data. It cannot be undone.'],
];

export default function Feedback() {
  const db = useDb();
  const { colors } = useTheme();
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [text, setText] = useState('');
  const [info, setInfo] = useState(true);
  const [thanks, setThanks] = useState<FeedbackKind | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery((d) => listFeedback(d), []);
  const ready = text.trim().length >= MIN_LEN;

  async function send() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const id = await saveFeedback(db, kind, text, info); // kept on the phone first, so nothing is lost if mail fails
      bumpData();
      const mail = buildMail(kind, text, info, appInfo(), appConfig.supportEmail);
      try {
        await Linking.openURL(mail.url);
        await markSent(db, id);
        setThanks(kind);
        setText('');
      } catch {
        toast('No mail app found. Your message is saved below, and you can send it later.');
      }
      bumpData();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend(id: string, k: FeedbackKind, message: string, includeInfo: boolean) {
    try {
      await Linking.openURL(buildMail(k, message, includeInfo, appInfo(), appConfig.supportEmail).url);
      await markSent(db, id);
      bumpData();
    } catch {
      toast('No mail app found on this phone');
    }
  }

  return (
    <SubScreen title="Help and feedback">
      {thanks ? (
        <Card tone="ink" style={{ gap: space.sm }}>
          <Tag label="Message ready" tone="primary" />
          <Text v="h2" color={colors.onInk}>Thank you</Text>
          <Text color={colors.onInkMuted}>{THANKS[thanks]}</Text>
          <Text v="small" color={colors.onInkMuted}>Your mail app opened with the message. Tap send there and it reaches us.</Text>
          <Button title="Done" kind="accent" onPress={() => setThanks(null)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <Text v="h3">Tell us what you think</Text>
          <Segmented options={(Object.keys(KIND_LABEL) as FeedbackKind[]).map((k) => ({ key: k, label: k === 'problem' ? 'Problem' : k === 'idea' ? 'Idea' : 'Praise' }))} value={kind} onChange={setKind} />
          <Field label={KIND_LABEL[kind]} value={text} onChangeText={(t) => setText(t.slice(0, MAX_LEN))} multiline placeholder={kind === 'problem' ? 'What happened, and on which screen?' : kind === 'idea' ? 'What would make BruhMe better for you?' : 'What works well for you?'} style={{ minHeight: 110, textAlignVertical: 'top' }} />
          <Text v="small" color={colors.textMuted}>Rather talk than type? Tap the microphone on your keyboard and speak. Your keyboard turns it into text here, and nothing is recorded by {appConfig.appName}.</Text>
          <Row style={{ justifyContent: 'space-between', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text v="small">Include app version and phone type</Text>
              <Text v="small" color={colors.textMuted}>Helps us fix problems. Never your entries.</Text>
            </View>
            <Switch accessibilityLabel="Include app version and phone type" value={info} onValueChange={setInfo} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" />
          </Row>
          <Button title="Send" icon="send" onPress={send} disabled={!ready} loading={busy} />
          <Text v="small" color={colors.textSubtle}>This opens your email app with the message filled in. You can read and change it before sending.</Text>
        </Card>
      )}

      <SectionHeader title="Quick answers" />
      <Group>{FAQ.map(([a, b]) => <ListRow key={a} title={a} sub={b} />)}</Group>

      {q.data?.length ? (
        <>
          <SectionHeader title="Your messages" />
          <Group>
            {q.data.map((f) => (
              <ListRow
                key={f.id}
                title={f.message}
                sub={`${KIND_LABEL[f.kind]} · ${formatDay(f.created_at)} · ${f.status === 'sent' ? 'Sent from your phone' : 'Saved, not sent yet'}`}
                leading={<IconTile size={36} icon={f.kind === 'problem' ? 'alert' : f.kind === 'idea' ? 'bulb' : 'heart'} />}
                right={f.status === 'saved' ? <Button title="Send" size="sm" kind="secondary" onPress={() => resend(f.id, f.kind, f.message, !!f.include_info)} /> : <Button title="Remove" size="sm" kind="ghost" onPress={async () => { await removeFeedback(db, f.id); bumpData(); }} />}
              />
            ))}
          </Group>
        </>
      ) : null}
      <ToastHost />
    </SubScreen>
  );
}
