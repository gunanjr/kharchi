import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Button, Field, Row, Text } from '@/components/ui';
import { useDb, bumpData } from '@/db/provider';
import { parseAmountToMinor } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { setGroupTrip, type Group } from '../repo';

const DAY = 86400000;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Turn trip mode on (starting today for N days, with an optional daily budget) or off. */
export function TripSheet({ group, visible, onClose }: { group: Group; visible: boolean; onClose: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const on = group.trip_start != null && group.trip_end != null;
  const [days, setDays] = useState(on ? String(Math.round((group.trip_end! - group.trip_start!) / DAY) + 1) : '5');
  const [budget, setBudget] = useState(group.daily_budget ? String(group.daily_budget / 100) : '');

  async function save() {
    const n = Math.floor(Number(days));
    if (!Number.isFinite(n) || n < 1 || n > 365) return toast('Enter a trip length from 1 to 365 days');
    let b: number | null = null;
    if (budget.trim()) {
      b = parseAmountToMinor(budget, group.currency);
      if (b === null) return toast('That budget doesn’t look right');
    }
    const start = on ? group.trip_start! : today();
    await setGroupTrip(db, group.id, { start, end: start + (n - 1) * DAY, dailyBudget: b });
    bumpData();
    onClose();
  }
  async function off() {
    await setGroupTrip(db, group.id, null);
    bumpData();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <View style={{ gap: space.lg, padding: space.lg }}>
          <View style={{ gap: 2 }}>
            <Text v="h2">Trip mode</Text>
            <Text v="small" color={colors.textMuted}>Counts the days, tracks spend against a daily budget and suggests who should pay next so it evens out. It only does the maths; nothing is blocked.</Text>
          </View>
          <Field label="How many days" value={days} onChangeText={setDays} keyboardType="number-pad" />
          <Field label={`Daily budget for the group (optional, ${group.currency})`} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="e.g. 3000" />
          <Row style={{ gap: space.sm }}>
            <Button title={on ? 'Save' : 'Start today'} onPress={save} style={{ flex: 1 }} />
            {on ? <Button title="Turn off" kind="secondary" onPress={off} style={{ flex: 1 }} /> : null}
          </Row>
        </View>
      </Sheet>
    </Modal>
  );
}
