import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BookIcon,
  CalendarIcon,
  CartIcon,
  HomeIcon,
  PersonIcon,
  PlusIcon,
} from '@/components/icons';
import { useColors } from '@/theme/theme-context';

const ICONS: Record<string, (p: { color: string; size?: number }) => React.ReactElement> = {
  home: HomeIcon,
  recipes: BookIcon,
  plan: CalendarIcon,
  grocery: CartIcon,
  profile: PersonIcon,
};

const LABELS: Record<string, string> = {
  home: 'Home',
  recipes: 'Recipes',
  plan: 'Plan',
  grocery: 'Grocery',
  profile: 'Profile',
};

/** Custom bar so we can hang the import FAB above the centre of it. */
function AsepoTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingBottom: insets.bottom || 8,
        paddingTop: 8,
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name];
        if (!Icon) return null;

        const tint = focused ? c.accent : c.textSec;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={LABELS[route.name]}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 }}>
            <Icon color={tint} size={23} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: tint }}>
              {LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}

      {/* Import FAB */}
      <Pressable
        onPress={() => router.push('/add')}
        accessibilityRole="button"
        accessibilityLabel="Add a recipe"
        style={({ pressed }) => ({
          position: 'absolute',
          // The bar is a row, so alignSelf centres vertically — offset from 50% instead.
          left: '50%',
          marginLeft: -28,
          // Floats clear of the bar so it never covers the middle tab.
          top: -70,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
          opacity: pressed ? 0.85 : 1,
        })}>
        <PlusIcon color="#fff" size={26} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AsepoTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="recipes" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="grocery" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
