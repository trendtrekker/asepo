import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/lib/use-animated-value';

/**
 * A Pressable that dips slightly on press — cheap tactile feedback for
 * anything tappable that isn't itself a toggle (a plan slot, a card that
 * navigates elsewhere). No layout impact: only the inner scale changes.
 */
export function AnimatedPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const scale = useAnimatedValue(1);

  return (
    <Pressable
      onPressIn={(e) => {
        Animated.spring(scale, { toValue: 0.97, friction: 6, tension: 300, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
      {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
