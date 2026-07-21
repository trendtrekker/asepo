import { useId } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useColors } from '@/theme/theme-context';
import { CTA_HEIGHT, radius } from '@/theme/tokens';

/* ------------------------------------------------------------------ *
 * Photo placeholder
 * The design stands in for photography with diagonal stripes. Swap this
 * component for <Image> once real recipe photos exist.
 * ------------------------------------------------------------------ */

export function PhotoPlaceholder({
  style,
  stripe = 20,
  colors: override,
  angle = 45,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  /** Full stripe period in px (design uses 20 for large, 12 for small tiles). */
  stripe?: number;
  colors?: [string, string];
  angle?: number;
  children?: React.ReactNode;
}) {
  const c = useColors();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [a, b] = override ?? [c.chipBg, c.bg];

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id={id}
            width={stripe}
            height={stripe}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${angle})`}>
            <Rect width={stripe / 2} height={stripe} fill={a} />
            <Rect x={stripe / 2} width={stripe / 2} height={stripe} fill={b} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

/** Dark "food photo" variant used for hero images and the tonight's-dinner card. */
export function PhotoHero({
  style,
  children,
  stripe = 20,
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  stripe?: number;
}) {
  const c = useColors();
  return (
    <PhotoPlaceholder style={style} stripe={stripe} colors={[c.photoA, c.photoB]} angle={45}>
      {children}
    </PhotoPlaceholder>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'tinted' | 'plain' | 'dark';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  height?: number;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  height = CTA_HEIGHT,
}: ButtonProps) {
  const c = useColors();

  const palette: Record<NonNullable<ButtonProps['variant']>, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.accent, fg: '#fff' },
    secondary: { bg: c.surface, fg: c.text, border: c.border },
    tinted: { bg: c.chipBg, fg: c.text },
    plain: { bg: 'transparent', fg: c.textSec },
    dark: { bg: '#000', fg: '#fff' },
  };
  const p = palette[variant];
  const isPlain = variant === 'plain';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: isPlain ? undefined : height,
          borderRadius: radius.pill,
          backgroundColor: p.bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: p.border ? 1.5 : 0,
          borderColor: p.border,
          paddingVertical: isPlain ? 8 : 0,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Text
        style={[
          { color: p.fg, fontSize: isPlain ? 15 : 17, fontWeight: isPlain ? '500' : '600' },
          textStyle,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Chip — the pill used for diets, allergies, cuisines, filters
 * ------------------------------------------------------------------ */

export function Chip({
  label,
  selected,
  onPress,
  /** 'fill' paints the whole chip in accent, 'tint' keeps text accent-coloured. */
  selectedStyle = 'tint',
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  selectedStyle?: 'fill' | 'tint';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const fill = selectedStyle === 'fill';

  const bg = selected ? (fill ? c.accent : c.accentTint2) : c.chipBg;
  const fg = selected ? (fill ? '#fff' : c.accent) : c.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        {
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: selected ? c.accent : 'transparent',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Text field
 * ------------------------------------------------------------------ */

export function Field({
  label,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label?: string }) {
  const c = useColors();
  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={c.textSec}
        {...inputProps}
        style={[
          {
            height: 48,
            borderRadius: radius.md,
            backgroundColor: c.inputBg,
            borderWidth: 1,
            borderColor: c.border,
            fontSize: 16,
            color: c.text,
            paddingHorizontal: 14,
          },
          inputProps.style,
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Misc primitives
 * ------------------------------------------------------------------ */

/** Grabber bar at the top of every bottom sheet. */
export function SheetHandle() {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.border }} />
    </View>
  );
}

export function SectionTitle({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <Text style={[{ fontSize: 17, fontWeight: '700', color: c.text }, style]}>{children}</Text>
  );
}

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</View>;
}

/** Circular icon button on translucent scrim (back/close over photos). */
export function ScrimButton({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? c.accent : c.chipBg,
        justifyContent: 'center',
      }}>
      <View
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
