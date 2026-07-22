import { Pressable, Text, View } from 'react-native';

import { Heart } from '@/components/icons';
import { RecipeImage } from '@/components/recipe-image';
import { calLabel, metaLine, timeLabel, type Recipe } from '@/data/sample';
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
