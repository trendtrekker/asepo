import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { Check } from '@/components/icons';
import { useAnimatedValue } from '@/lib/use-animated-value';
import { useColors } from '@/theme/theme-context';

/**
 * A checkbox circle that pops on toggle — used anywhere something gets
 * checked off: recipe ingredients, grocery items. Purely a visual flourish
 * on top of whatever boolean the caller already tracks; no state of its own
 * beyond the animation.
 */
export function AnimatedCheckbox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  const c = useColors();
  const scale = useAnimatedValue(1);
  const prevChecked = useRef(checked);

  useEffect(() => {
    if (prevChecked.current === checked) return;
    prevChecked.current = checked;
    scale.setValue(0.7);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [checked, scale]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: checked ? 0 : 1.5,
        borderColor: c.border,
        backgroundColor: checked ? c.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}>
      {checked ? <Check color="#fff" size={size * 0.5} /> : null}
    </Animated.View>
  );
}
