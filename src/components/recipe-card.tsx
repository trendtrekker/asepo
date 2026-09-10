import { Pressable, Text, View } from 'react-native';

import { Heart } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { metaLine, type Recipe } from '@/data/sample';
import { useStore } from '@/store/app-store';
import { useColors } from '@/theme/theme-context';

/** Heart button that sits on top of a card image. */
function FavouriteBadge({ recipe }: { recipe: Recipe }) {
  const c = useColors();
  const { isFavorite, toggleFavorite } = useStore();
  const fav = isFavorite(recipe);

  return (
    <Pressable
      onPress={() => toggleFavorite(recipe.id)}
      accessibilityRole="button"
      accessibilityLabel={fav ? `Unfavourite ${recipe.title}` : `Favourite ${recipe.title}`}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Heart fill={fav ? c.accent : 'transparent'} stroke="#fff" />
    </Pressable>
  );
}

/** 2-up grid card used on Recipes and Cookbook detail. */
export function RecipeGridCard({
  recipe,
  showFavorite = true,
  onPress,
}: {
  recipe: Recipe;
  showFavorite?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <RecipeImage
        recipe={recipe}
        glyph={44}
        style={{ height: 118, borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
        {showFavorite ? <FavouriteBadge recipe={recipe} /> : null}
      </RecipeImage>
      <Text style={{ marginTop: 8, fontSize: 14.5, fontWeight: '600', color: c.text }}>
        {recipe.title}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 12.5, color: c.textSec }}>
        {metaLine(recipe)}
      </Text>
    </Pressable>
  );
}

/** Asymmetric image-led card used by the recipe library's bento grid. */
export function RecipeBentoCard({
  recipe,
  featured = false,
  tall = false,
  onPress,
}: {
  recipe: Recipe;
  featured?: boolean;
  tall?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const height = featured ? 216 : tall ? 178 : 142;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, ${metaLine(recipe)}`}
      style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surface }}>
      <RecipeImage recipe={recipe} glyph={featured ? 62 : 42} style={{ height }}>
        <FavouriteBadge recipe={recipe} />
        {featured ? (
          <View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              paddingHorizontal: 16, paddingTop: 35, paddingBottom: 14,
              backgroundColor: 'rgba(0,0,0,0.48)',
            }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }} numberOfLines={2}>{recipe.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 4 }}>{metaLine(recipe)}</Text>
          </View>
        ) : null}
      </RecipeImage>
      {!featured ? (
        <View style={{ paddingHorizontal: 4, paddingTop: 9, paddingBottom: 7 }}>
          <Text style={{ fontSize: tall ? 15.5 : 14.5, lineHeight: 19, fontWeight: '700', color: c.text }} numberOfLines={2}>{recipe.title}</Text>
          <Text style={{ marginTop: 3, fontSize: 12, color: c.textSec }}>{metaLine(recipe)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Full-width row used in list view. */
export function RecipeListRow({ recipe, onPress }: { recipe: Recipe; onPress?: () => void }) {
  const c = useColors();
  const { isFavorite, toggleFavorite } = useStore();
  const fav = isFavorite(recipe);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}>
      <RecipeImage
        recipe={recipe}
        glyph={30}
        style={{ width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: c.border }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{recipe.title}</Text>
        <Text style={{ marginTop: 3, fontSize: 12.5, color: c.textSec }}>
          {metaLine(recipe)} · Serves {recipe.servings}
        </Text>
      </View>
      <Pressable
        onPress={() => toggleFavorite(recipe.id)}
        accessibilityRole="button"
        accessibilityLabel={fav ? `Unfavourite ${recipe.title}` : `Favourite ${recipe.title}`}
        style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Heart
          size={18}
          fill={fav ? c.accent : 'transparent'}
          stroke={c.textSec}
          strokeWidth={1.3}
        />
      </Pressable>
    </Pressable>
  );
}

/** 148pt-wide card for the horizontal carousels on Home. */
export function RecipeCarouselCard({ recipe, onPress }: { recipe: Recipe; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ width: 148 }}>
      <RecipeImage
        recipe={recipe}
        glyph={38}
        style={{ height: 106, borderRadius: 14, borderWidth: 1, borderColor: c.border }}
      />
      <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={2}>
        {recipe.title}
      </Text>
      <Text style={{ marginTop: 2, fontSize: 12, color: c.textSec }}>
        {metaLine(recipe)}
      </Text>
    </Pressable>
  );
}
