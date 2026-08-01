import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedValue } from '@/lib/use-animated-value';
import { useColors } from '@/theme/theme-context';

/**
 * Minimal toast. Used mainly to acknowledge controls whose destination screens
 * aren't designed yet — silence makes the app feel broken. Replace those calls
 * with real navigation as each screen lands.
 */

type ToastValue = { show: (message: string) => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useAnimatedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const c = useColors();

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => finished && setMessage(null)
        );
      }, 2200);
    },
    [opacity]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: insets.bottom + 96,
            opacity,
            alignItems: 'center',
          }}>
          <View
            style={{
              backgroundColor: c.text,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 22,
              maxWidth: '100%',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}>
            <Text style={{ color: c.bg, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
