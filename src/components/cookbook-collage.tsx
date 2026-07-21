import { StyleSheet, View } from 'react-native';

import { RecipeImage } from '@/components/recipe-image';
import { PhotoPlaceholder } from '@/components/ui';
import type { Recipe } from '@/data/sample';

/**
 * Cookbook cover: a 2×2 collage built from the first four recipes it contains,
 * falling back to neutral tiles when the cookbook is emptier than that.
 */
export function CookbookCollage({
  recipes,
  glyph = 26,
}: {
  recipes: Recipe[];
  glyph?: number;
}) {
  const tiles = recipes.slice(0, 4);

  return (
    <View style={StyleSheet.absoluteFill}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flex: 1, flexDirection: 'row', gap: 1 }}>
          {[0, 1].map((col) => {
            const recipe = tiles[row * 2 + col];
            return recipe ? (
              <RecipeImage key={col} recipe={recipe} glyph={glyph} style={{ flex: 1 }} />
            ) : (
              <PhotoPlaceholder key={col} style={{ flex: 1 }} stripe={12} angle={45} />
            );
          })}
        </View>
      ))}
    </View>
  );
}
