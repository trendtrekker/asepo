import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { AppStoreProvider } from '@/store/app-store';
import { AsepoThemeProvider, useTheme } from '@/theme/theme-context';

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />

        {/* Import flow — presented over whatever screen launched it. */}
        <Stack.Screen
          name="add/index"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="add/limit"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="add/share-preview"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="add/importing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add/review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add/failed" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add/manual" options={{ presentation: 'modal' }} />

        <Stack.Screen
          name="add-to-plan/[id]"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen name="edit-recipe/[id]" options={{ presentation: 'modal' }} />

        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="cookbooks/new" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AsepoThemeProvider>
          <AppStoreProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </AppStoreProvider>
        </AsepoThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
