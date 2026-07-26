import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { SheetHandle } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Bottom sheet for adding/removing recipes from one cookbook. */
export function RecipePickerSheet({
  cookbookId,
  onClose,
}: {
  cookbookId: string;
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { recipes, addRecipeToCookbook, removeRecipeFromCookbook } = useStore();

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
          maxHeight: '82%',
        }}>
        <SheetHandle />
        <Text style={{ paddingHorizontal: 20, fontSize: 20, fontWeight: '700', color: c.text }}>
          Add recipes
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14 }}>
          {recipes.length === 0 ? (
            <Text style={{ fontSize: 13.5, color: c.textSec, paddingVertical: 8 }}>
              No recipes yet
            </Text>
          ) : null}
          {recipes.map((r) => {
            const on = r.cookbooks.includes(cookbookId);
            return (
              <Pressable
                key={r.id}
                onPress={() =>
                  on ? removeRecipeFromCookbook(r.id, cookbookId) : addRecipeToCookbook(r.id, cookbookId)
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                }}>
                <RecipeImage recipe={r} glyph={22} style={{ width: 44, height: 44, borderRadius: 10 }} />
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: c.text }}>
                  {r.title}
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
      </View>
    </View>
  );
}
