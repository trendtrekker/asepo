import { useRef } from 'react';
import { Animated } from 'react-native';

/**
 * react-native@0.86 ships a real useAnimatedValue, but react-native-web@0.21
 * doesn't implement it (verified: `'useAnimatedValue' in require('react-native-web')`
 * is false) — importing it from 'react-native' crashes the web build with
 * "useAnimatedValue is not a function" the moment any screen using it mounts.
 *
 * This is RN's own implementation, copied: a lazily-initialized ref, which is
 * what useRef(new Animated.Value(x)).current was already doing structurally.
 * The eslint-disable below is the same one that pattern needed — accessing
 * ref.current during render — kept to this one file instead of one per
 * call site, since there's no cross-platform-safe alternative to reach for.
 */
export function useAnimatedValue(initialValue: number): Animated.Value {
  const ref = useRef<Animated.Value | null>(null);
  if (ref.current == null) {
    ref.current = new Animated.Value(initialValue);
  }
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}
