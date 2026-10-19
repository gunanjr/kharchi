import React, { useRef, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Screen, Text, Button, Row } from '@/components/ui';
import { Illustration } from '@/components/Feedback';
import { useDb, bumpData } from '@/db/provider';
import { hasAnyData, loadCompleteDemo } from '@/features/dev/loadDemo';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { layout, space } from '@/theme/tokens';

const PAGES = [
  { art: 'wallet', t: 'onb.1.title', b: 'onb.1.body' },
  { art: 'group', t: 'onb.2.title', b: 'onb.2.body' },
  { art: 'chat', t: 'onb.3.title', b: 'onb.3.body' },
] as const;

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const t = useT();
  const db = useDb();
  const set = useSettings((s) => s.set);
  const [i, setI] = useState(0);
  const list = useRef<FlatList>(null);
  const reduce = useReducedMotion();

  const next = () => {
    if (i < PAGES.length - 1) {
      list.current?.scrollToIndex({ index: i + 1, animated: !reduce });
      setI(i + 1);
    } else {
      // Development builds (Expo Go) start with the complete sample data so every screen has content. Store builds never do.
      (async () => {
        if (__DEV__ && !(await hasAnyData(db))) { await loadCompleteDemo(db); bumpData(); }
        set(db, 'onboarded', true);
      })();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(p) => p.art}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: layout.gutter + 8, justifyContent: 'center', alignItems: 'center', gap: space.lg }}>
            <Animated.View entering={reduce ? undefined : FadeIn.duration(600)} style={{ marginBottom: space.lg }}><Illustration kind={item.art} size={260} /></Animated.View>
            <Text v="display" style={{ textAlign: 'center', fontSize: 34, lineHeight: 38 }} accessibilityRole="header">{t(item.t)}</Text>
            <Text v="body" color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 330, fontSize: 16, lineHeight: 24 }}>{t(item.b)}</Text>
          </View>
        )}
      />
      <View style={{ padding: layout.gutter, paddingBottom: space.xl, gap: space.xl, alignItems: 'center' }}>
        <Row accessibilityElementsHidden style={{ gap: 6 }}>
          {PAGES.map((p, k) => <View key={p.art} style={{ width: k === i ? 28 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.ink : colors.track }} />)}
        </Row>
        <Button title={i === PAGES.length - 1 ? t('onb.start') : t('onb.next')} onPress={next} style={{ alignSelf: 'stretch' }} />
      </View>
    </Screen>
  );
}
