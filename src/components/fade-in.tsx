import { useEffect, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/lib/use-animated-value';

/**
 * Fades (and gently rises) content in on mount — a button, a card, a whole
 * carousel. Runs once per mount, not on every re-render, so re-rendering the
 * parent (e.g. a store update) doesn't replay the animation.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 320,
  style,
}: {
  children: ReactNode;
  /** Stagger — pass i * 40 or so when fading in a list of cards. */
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useAnimatedValue(0);
  const translateY = useAnimatedValue(8);

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
    // Deliberately mount-only — see the doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
