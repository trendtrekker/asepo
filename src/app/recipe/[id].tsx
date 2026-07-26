import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Check, ChevronLeft, Heart, MoreHorizontal } from '@/components/icons';
import { CookbookPickerSheet } from '@/components/cookbook-picker-sheet';
import { RecipeImage } from '@/components/recipe-image';
import { useToast } from '@/components/toast';
import { Button, Screen, ScrimButton } from '@/components/ui';
import { calLabel, timeLabel } from '@/data/sample';
import { estimateMacros } from '@/lib/nutrition';
import { convertMeasure } from '@/lib/quantity';
import { extractTimer } from '@/lib/steps';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

type Tab = 'Ingredients' | 'Steps' | 'Nutrition';

/**
 * Recipe detail — block 4 of the spec, designed here rather than in Claude
 * Design. Swap freely once a real design lands; the data plumbing stays.
 */
export default function RecipeDetail() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite, getRecipe, deleteRecipe, addRecipeToGrocery } = useStore();

  const recipe = getRecipe(id);
  const [tab, setTab] = useState<Tab>('Ingredients');
  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [metric, setMetric] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cookbookSheetOpen, setCookbookSheetOpen] = useState(false);

  if (!recipe) {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Recipe not found</Text>
        <Button title="Go back" variant="plain" onPress={() => router.back()} />
      </Screen>
    );
  }

  // Deep links have no history to pop — send those to the library instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/recipes`));

  const fav = isFavorite(recipe);
  const factor = servings / recipe.servings;
  const scaled = factor !== 1;
  const macros = estimateMacros(recipe);
  const perServingCalories = Math.round(recipe.calories);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Hero */}
        <RecipeImage recipe={recipe} glyph={92} style={{ height: 260, justifyContent: 'flex-end' }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
        </RecipeImage>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>
            {recipe.title}
          </Text>

          {/* Source + rating */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.chipBg }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text }}>
                {recipe.source.handle}
              </Text>
              <Text style={{ fontSize: 12, color: c.textSec }}>
                From {recipe.source.platform} · view original
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: c.textSec }}>
              {'★'.repeat(recipe.rating)}
              <Text style={{ color: c.border }}>{'★'.repeat(5 - recipe.rating)}</Text>
            </Text>
          </View>

          {/* Meta pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {[
              timeLabel(recipe),
              `Serves ${servings}`,
              // Imported recipes often carry no calorie data; a "0 cal" pill
              // would read as a claim rather than missing information.
              recipe.calories > 0 ? calLabel(recipe) : null,
              recipe.difficulty,
            ]
              .filter((label): label is string => Boolean(label))
              .map((label) => (
                <View
                  key={label}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 13,
                    borderRadius: 14,
                    backgroundColor: c.chipBg,
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{label}</Text>
                </View>
              ))}
          </View>

          {/* Recipe actions — sit above the tabs so they apply to the whole
              recipe, not just whichever tab happens to be open. Laid out as a
              2×2 grid: four across is too narrow for "Add to grocery list". */}
          <View style={{ gap: 8, marginTop: 20 }}>
            {[
              [
                {
                  label: 'Add to grocery list',
                  tone: 'accent' as const,
                  onPress: () => {
                    const count = addRecipeToGrocery(recipe, servings);
                    toast.show(`Added ${count} items to your grocery list`);
                  },
                },
                {
                  label: 'Add to plan',
                  tone: 'neutral' as const,
                  onPress: () =>
                    router.push({ pathname: '/add-to-plan/[id]', params: { id: recipe.id } }),
                },
              ],
              [
                {
                  label: 'Edit recipe',
                  tone: 'neutral' as const,
                  onPress: () =>
                    router.push({ pathname: '/edit-recipe/[id]', params: { id: recipe.id } }),
                },
                {
                  label: 'Delete',
                  tone: 'danger' as const,
                  onPress: () => setConfirmDelete(true),
                },
              ],
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                {row.map((action) => (
                  <ActionPill key={action.label} {...action} />
                ))}
              </View>
            ))}
          </View>

          {/* Tabs */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: c.chipBg,
              borderRadius: 12,
              padding: 4,
              marginTop: 20,
            }}>
            {(['Ingredients', 'Steps', 'Nutrition'] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 9,
                    alignItems: 'center',
                    backgroundColor: active ? c.surface : 'transparent',
                  }}>
                  <Text
                    style={{ fontSize: 13.5, fontWeight: '600', color: active ? c.text : c.textSec }}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'Ingredients' ? (
            <>
              {/* Servings + units */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 18,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Stepper label="−" onPress={() => setServings((s) => Math.max(1, s - 1))} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, minWidth: 74 }}>
                    Serves {servings}
                  </Text>
                  <Stepper
                    label="+"
                    tone="accent"
                    onPress={() => setServings((s) => Math.min(24, s + 1))}
                  />
                </View>

                <View style={{ flexDirection: 'row', backgroundColor: c.chipBg, borderRadius: 10, padding: 3 }}>
                  {[
                    { key: false, label: 'US' },
                    { key: true, label: 'Metric' },
                  ].map((opt) => (
                    <Pressable
                      key={opt.label}
                      onPress={() => setMetric(opt.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: metric === opt.key }}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: metric === opt.key ? c.surface : 'transparent',
                      }}>
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '600',
                          color: metric === opt.key ? c.text : c.textSec,
                        }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                {recipe.ingredients.map((ing, i) => {
                  const m = convertMeasure(ing.qty, ing.unit, factor, metric);
                  const on = !!checked[i];
                  return (
                    <Pressable
                      key={`${ing.name}-${i}`}
                      onPress={() => setChecked((s) => ({ ...s, [i]: !s[i] }))}
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
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: on ? c.accent : c.border,
                          backgroundColor: on ? c.accent : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {on ? <Check color="#fff" size={11} /> : null}
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: on ? c.textSec : c.text,
                          textDecorationLine: on ? 'line-through' : 'none',
                        }}>
                        <Text style={{ fontWeight: '700', color: scaled && !on ? c.accent : undefined }}>
                          {m.qty}
                          {m.unit ? ` ${m.unit}` : ''}
                        </Text>
                        {m.qty || m.unit ? '  ' : ''}
                        {ing.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {tab === 'Steps' ? (
            <View style={{ gap: 14, marginTop: 18 }}>
              {recipe.instructions.map((step, i) => {
                const timer = extractTimer(step);
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: c.accentTint2,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.accent }}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, lineHeight: 23, color: c.text }}>{step}</Text>
                      {timer ? (
                        <Pressable
                          onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, step: i } })}
                          accessibilityRole="button"
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 7,
                            paddingHorizontal: 12,
                            borderRadius: 16,
                            backgroundColor: c.accentTint,
                          }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: c.accent }}>
                            {timer.label} ▸
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {tab === 'Nutrition' ? (
            <View style={{ marginTop: 18 }}>
              <View
                style={{
                  backgroundColor: c.chipBg,
                  borderRadius: 16,
                  padding: 18,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 34, fontWeight: '700', color: c.text }}>
                  {perServingCalories}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: c.textSec }}>
                  calories per serving
                </Text>
              </View>

              <View style={{ marginTop: 16, gap: 14 }}>
                <MacroBar label="Protein" grams={macros.protein} total={recipe.calories} kcalPerGram={4} />
                <MacroBar label="Carbs" grams={macros.carbs} total={recipe.calories} kcalPerGram={4} />
                <MacroBar label="Fat" grams={macros.fat} total={recipe.calories} kcalPerGram={9} />
              </View>

              <View
                style={{
                  marginTop: 18,
                  backgroundColor: c.accentTint,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}>
                <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.text }}>
                  Estimated from the ingredient list. Real values arrive when the nutrition
                  database is wired up.
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating chrome */}
      <ScrimButton
        onPress={goBack}
        style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <ChevronLeft color="#fff" />
      </ScrimButton>
      <View
        style={{ position: 'absolute', top: insets.top + 8, right: 16, flexDirection: 'row', gap: 10 }}>
        <ScrimButton onPress={() => toggleFavorite(recipe.id)}>
          <Heart size={15} fill={fav ? '#fff' : 'transparent'} stroke="#fff" strokeWidth={1.2} />
        </ScrimButton>
        <ScrimButton onPress={() => setMenuOpen((o) => !o)}>
          <MoreHorizontal color="#fff" />
        </ScrimButton>
      </View>

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
            minWidth: 180,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}>
          {/* Edit / Add to plan / Delete moved to the action row above the tabs. */}
          {['Add to cookbook', 'Share'].map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                setMenuOpen(false);
                if (label === 'Add to cookbook') {
                  setCookbookSheetOpen(true);
                } else if (label === 'Share') {
                  Share.share({ message: `Check out “${recipe.title}” on Asepo` }).catch(() => {});
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

      {cookbookSheetOpen ? (
        <CookbookPickerSheet recipeId={recipe.id} onClose={() => setCookbookSheetOpen(false)} />
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
              Delete this recipe?
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: c.textSec }}>
              “{recipe.title}” will be removed from your library and any meals you’ve planned with
              it. This can’t be undone.
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
                  deleteRecipe(recipe.id);
                  goBack();
                  toast.show(`Deleted “${recipe.title}”`);
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

      {/* Bottom action bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}>
        <Button
          title="Start cooking"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id } })}
        />
      </View>
    </Screen>
  );
}

/** Compact recipe-level action above the tab bar. */
function ActionPill({
  label,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'danger';
  onPress: () => void;
}) {
  const c = useColors();

  const palette = {
    neutral: { bg: c.chipBg, fg: c.text },
    accent: { bg: c.accentTint2, fg: c.accent },
    danger: { bg: 'transparent', fg: c.danger },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        // flex:1 with a fixed height keeps all four identical, and each row
        // spans the full section width.
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        borderRadius: 22,
        backgroundColor: palette.bg,
        borderWidth: tone === 'danger' ? 1 : 0,
        borderColor: c.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text
        numberOfLines={1}
        style={{ fontSize: 13.5, fontWeight: '600', color: palette.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({
  label,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  tone?: 'neutral' | 'accent';
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Increase servings' : 'Decrease servings'}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'accent' ? c.accent : c.chipBg,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: tone === 'accent' ? '#fff' : c.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MacroBar({
  label,
  grams,
  total,
  kcalPerGram,
}: {
  label: string;
  grams: number;
  total: number;
  kcalPerGram: number;
}) {
  const c = useColors();
  const share = total ? Math.min(1, (grams * kcalPerGram) / total) : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{label}</Text>
        <Text style={{ fontSize: 14, color: c.textSec }}>
          {grams} g · {Math.round(share * 100)}%
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chipBg, overflow: 'hidden' }}>
        <View
          style={{ width: `${share * 100}%`, height: '100%', borderRadius: 4, backgroundColor: c.accent }}
        />
      </View>
    </View>
  );
}
