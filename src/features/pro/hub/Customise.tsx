import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Text, Row, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { useDb } from '@/db/provider';
import { WIDGETS, PIN_TABS, type PinTab } from '@/features/pro/widgets';
import { useSettings } from '@/store/settings';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';
import { PALETTE_COUNT, paletteName, paletteSwatch } from './theme';

const Caps = ({ children, color }: { children: React.ReactNode; color: string }) => <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color }}>{children}</Text>;

/** A palette as a small card: the page colour with its accent bar and the month it belongs to. */
function Swatch({ i, on, onPress }: { i: number; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const [base, accent] = paletteSwatch(i);
  return (
    <Press onPress={onPress} accessibilityLabel={`${paletteName(i)} colours`} accessibilityState={{ selected: on }}
      style={{ width: 76, height: 96, borderRadius: 18, backgroundColor: base, padding: 10, justifyContent: 'space-between', borderWidth: 3, borderColor: on ? colors.primary : 'rgba(255,255,255,0.12)' }}>
      <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: accent }} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' }}>{paletteName(i).slice(0, 3)}</Text>
    </Press>
  );
}

function Mode({ on, title, sub, onPress }: { on: boolean; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={title} accessibilityState={{ selected: on }} style={{ flex: 1, borderRadius: 18, padding: space.md, gap: 4, backgroundColor: on ? colors.primary : colors.surfaceAlt }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: on ? colors.onPrimary : colors.text }}>{title}</Text>
        {on ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
      </Row>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: on ? 'rgba(20,24,31,0.7)' : colors.textMuted }}>{sub}</Text>
    </Press>
  );
}

/** Customise Pro: colours (follow the season, or keep one) and which Pro tools are pinned to the other tabs. */
export function CustomiseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const pick = useSettings((s) => s.proPalette);
  const pins = useSettings((s) => s.proPins);
  const set = useSettings((s) => s.set);
  const month = new Date().getMonth();
  const shown = pick >= 0 ? pick : month;
  const toggle = (tab: PinTab, id: string) => {
    const cur = pins[tab];
    haptic.tap();
    set(db, 'proPins', { ...pins, [tab]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <View style={{ maxHeight: 660 }}>
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm }}>
            <Text v="h2">Customise Pro</Text>
            <Press onPress={onClose} accessibilityLabel="Done" style={{ borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary }}>Done</Text>
            </Press>
          </Row>
          <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.xl }}>
            {/* colours */}
            <View style={{ gap: space.md }}>
              <Caps color={colors.textMuted}>COLOURS</Caps>
              <Row style={{ gap: space.sm }}>
                <Mode on={pick < 0} title="Follow the season" sub={`New colours every month. Now: ${paletteName(month)}.`} onPress={() => set(db, 'proPalette', -1)} />
                <Mode on={pick >= 0} title="Keep one" sub={pick >= 0 ? `Keeping ${paletteName(pick)}.` : 'Pick a palette below.'} onPress={() => set(db, 'proPalette', shown)} />
              </Row>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {Array.from({ length: PALETTE_COUNT }, (_, k) => (k + month) % PALETTE_COUNT).map((i) => <Swatch key={i} i={i} on={pick >= 0 ? pick === i : month === i} onPress={() => set(db, 'proPalette', i)} />)}
              </ScrollView>
            </View>

            {/* pins */}
            <View style={{ gap: space.sm }}>
              <Caps color={colors.textMuted}>PIN TO YOUR TABS</Caps>
              <Text v="small" color={colors.textMuted}>Tick where each Pro tool should also show up.</Text>
              <View style={{ borderRadius: 18, backgroundColor: colors.surfaceAlt, paddingHorizontal: space.md, marginTop: space.xs }}>
                <Row style={{ paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted }}>TOOL</Text>
                  {PIN_TABS.map((x) => <Text key={x.key} style={{ width: 54, textAlign: 'center', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.3, color: colors.textMuted }}>{x.label.toUpperCase()}</Text>)}
                </Row>
                {WIDGETS.filter((w) => w.id !== 'aura').map((w, i, all) => (
                  <Row key={w.id} style={{ paddingVertical: space.sm + 2, borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                    <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.text }} numberOfLines={2}>{w.title}</Text>
                    {PIN_TABS.map((x) => {
                      const can = w.id !== 'comingUp' || x.key === 'home';
                      const on = can && pins[x.key].includes(w.id);
                      return (
                        <View key={x.key} style={{ width: 54, alignItems: 'center' }}>
                          {can ? (
                            <Press onPress={() => toggle(x.key, w.id)} accessibilityLabel={`${w.title} on ${x.label}`} accessibilityState={{ checked: on }} hitSlop={8}
                              style={{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primary : 'transparent', borderWidth: on ? 0 : 2, borderColor: colors.border }}>
                              {on ? <Icon name="check" size={16} color={colors.onPrimary} /> : <View />}
                            </Press>
                          ) : <Text style={{ color: colors.textSubtle }}>–</Text>}
                        </View>
                      );
                    })}
                  </Row>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Sheet>
    </Modal>
  );
}
