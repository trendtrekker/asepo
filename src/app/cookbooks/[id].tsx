import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CookbookCollage } from '@/components/cookbook-collage';
import { ChevronLeft, MoreHorizontal } from '@/components/icons';
import { RecipeGridCard } from '@/components/recipe-card';
import { RecipePickerSheet } from '@/components/recipe-picker-sheet';
import { Button, Screen, ScrimButton, SheetHandle } from '@/components/ui';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';
import { useToast } from '@/components/toast';

/** Screen 19 — Cookbook detail. */
export default function CookbookDetail() {
  const toast = useToast();
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addRecipesOpen, setAddRecipesOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { cookbooks, recipesInCookbook, renameCookbook, deleteCookbook } = useStore();

  const cookbook = cookbooks.find((cb) => cb.id === id);

  // Reachable via a stale deep link, or after the cookbook is deleted.
  if (!cookbook) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Cookbook not found</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.accent }}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  const recipes = recipesInCookbook(cookbook.id);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ height: 220, justifyContent: 'flex-end' }}>
          <CookbookCollage recipes={recipes} glyph={44} />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.3 }}>
              {cookbook.name}
            </Text>
            <Text
              style={{ marginTop: 2, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
              {cookbook.count} recipes
            </Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddRecipesOpen(true)}
            style={{
              height: 46,
              borderRadius: 23,
              backgroundColor: c.chipBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
            <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.text }}>+ Add recipes</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {recipes.map((r) => (
              <View key={r.id} style={{ width: '47%', flexGrow: 1 }}>
                <RecipeGridCard recipe={r} showFavorite={false} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating chrome */}
      <ScrimButton
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <ChevronLeft color="#fff" />
      </ScrimButton>
      <ScrimButton
        onPress={() => setMenuOpen((o) => !o)}
        style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
        <MoreHorizontal color="#fff" />
      </ScrimButton>

      {menuOpen ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 48,
            right: 16,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            overflow: 'hidden',
            minWidth: 170,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}>
          {['Rename', 'Change cover', 'Share', 'Delete'].map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                setMenuOpen(false);
                if (label === 'Rename') {
                  setRenameValue(cookbook.name);
                  setRenaming(true);
                } else if (label === 'Change cover') {
                  toast.show('Photo picker comes with the backend');
                } else if (label === 'Share') {
                  Share.share({ message: `Check out my “${cookbook.name}” cookbook on Asepo` }).catch(() => {});
                } else if (label === 'Delete') {
                  setConfirmDelete(true);
                }
              }}
              accessibilityRole="menuitem"
              style={{ paddingVertical: 11, paddingHorizontal: 14 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: label === 'Delete' ? c.danger : c.text,
                }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {addRecipesOpen ? (
        <RecipePickerSheet cookbookId={cookbook.id} onClose={() => setAddRecipesOpen(false)} />
      ) : null}

      {renaming ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setRenaming(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }}
          />
          <View
            style={{
              backgroundColor: c.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
            }}>
            <SheetHandle />
            <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Rename cookbook</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              style={{
                marginTop: 16,
                height: 48,
                borderRadius: 12,
                backgroundColor: c.inputBg,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: 14,
                fontSize: 16,
                color: c.text,
              }}
            />
            <View style={{ marginTop: 16 }}>
              <Button
                title="Save"
                onPress={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed) renameCookbook(cookbook.id, trimmed);
                  setRenaming(false);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* Delete confirmation — destructive, so never a single tap. */}
      {confirmDelete ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
          <View
            style={{
              width: '100%',
              backgroundColor: c.surface,
              borderRadius: 20,
              padding: 22,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>
              Delete this cookbook?
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: c.textSec }}>
              “{cookbook.name}” will be removed. The recipes inside stay in your library.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <Button
                title="Cancel"
                variant="tinted"
                style={{ flex: 1 }}
                textStyle={{ fontSize: 15 }}
                onPress={() => setConfirmDelete(false)}
              />
              <Pressable
                onPress={() => {
                  setConfirmDelete(false);
                  deleteCookbook(cookbook.id);
                  router.back();
                  toast.show(`Deleted “${cookbook.name}”`);
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flex: 1,
                  height: 52,
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.danger,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
