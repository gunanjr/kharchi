import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import makeQr from 'qrcode-generator';

/**
 * A QR code drawn as one SVG path (fast to render). Encodes text on the phone; nothing is fetched. With `logo`, the code
 * uses the highest error correction so a small badge in the middle never stops it scanning.
 */
export function QrCode({ value, size = 200, color = '#111111', bg = '#FFFFFF', logo }: { value: string; size?: number; color?: string; bg?: string; logo?: React.ReactNode }) {
  const { d, n } = useMemo(() => {
    const qr = makeQr(0, logo ? 'H' : 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let p = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) p += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { d: p, n: count + 4 };
  }, [value, logo]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} accessibilityLabel="Payment QR code" style={{ position: 'absolute' }}>
        <Rect x={0} y={0} width={n} height={n} fill={bg} />
        <Path d={d} fill={color} />
      </Svg>
      {logo ? <View style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.06, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{logo}</View> : null}
    </View>
  );
}
