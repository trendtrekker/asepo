import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check } from '@/components/icons';
import { SheetHandle } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/**
 * Bottom sheet for choosing which cookbooks a recipe belongs to.
 *
 * Two modes, picked by which props are passed:
 *  - `recipeId` set: an existing recipe — taps write straight to the store.
 *  - `selected`/`onToggle` set: a recipe still being created (review/manual
 *    entry) that has no id yet — taps update the caller's local state, and
 *    the caller applies it as `cookbooks` when it finally saves.
 */
export function CookbookPickerSheet({
  recipeId,
  selected,
  onToggle,
  onClose,
}: {
  recipeId?: string;
  selected?: Record<string, boolean>;
  onToggle?: (cookbookId: string) => void;
  onClose: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cookbooks, recipes, addRecipeToCookbook, removeRecipeFromCookbook } = useStore();

  const recipe = recipeId ? recipes.find((r) => r.id === recipeId) : undefined;
  const isOn = (cookbookId: string) =>
    recipeId ? (recipe?.cookbooks.includes(cookbookId) ?? false) : (selected?.[cookbookId] ?? false);

  const toggle = (cookbookId: string) => {
    if (recipeId) {
      if (isOn(cookbookId)) removeRecipeFromCookbook(recipeId, cookbookId);
      else addRecipeToCookbook(recipeId, cookbookId);
    } else {
      onToggle?.(cookbookId);
    }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
      />

      <View
        style={{
          backgroundColor: c.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 20,
          maxHeight: '75%',
        }}>
        <SheetHandle />
        <Text style={{ paddingHorizontal: 20, fontSize: 20, fontWeight: '700', color: c.text }}>
          Save to cookbook
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14 }}>
          {cookbooks.length === 0 ? (
            <Text style={{ fontSize: 13.5, color: c.textSec, paddingVertical: 8 }}>
              No cookbooks yet
            </Text>
          ) : null}
          {cookbooks.map((cb) => {
            const on = isOn(cb.id);
            return (
              <Pressable
                key={cb.id}
                onPress={() => toggle(cb.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: cb.color ?? c.chipBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 16 }}>{cb.emoji ?? '📖'}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: c.text }}>
                  {cb.name}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: on ? c.accent : 'transparent',
                    borderWidth: 1.5,
                    borderColor: on ? c.accent : c.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {on ? <Check color="#fff" size={11} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              router.push(recipeId ? { pathname: '/cookbooks/new', params: { preselect: recipeId } } : '/cookbooks/new');
            }}
            style={{ paddingVertical: 10 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.accent }}>+ New cookbook</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
