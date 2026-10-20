import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { appConfig } from '@/config/app';

const DARK_TEXT = require('../../assets/brand/wordmark-sm.png');
const LIGHT_TEXT = require('../../assets/brand/wordmark-sm-light.png');
const RATIO = 1487 / 331;

/** The brand wordmark. The navy letters switch to off-white on the dark theme so they stay readable. */
export function Wordmark({ height = 34 }: { height?: number }) {
  const { dark } = useTheme();
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={appConfig.appName}>
      <Image source={dark ? LIGHT_TEXT : DARK_TEXT} resizeMode="contain" style={{ height, width: Math.round(height * RATIO) }} />
    </View>
  );
}

const MARK = require('../../assets/brand/mark.png');
/** The hand mark on its own (square). */
export function BrandMark({ size = 64 }: { size?: number }) {
  return <Image source={MARK} resizeMode="contain" accessibilityIgnoresInvertColors style={{ width: size, height: size }} />;
}
