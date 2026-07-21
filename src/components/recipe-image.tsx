import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { recipePhoto, type Recipe } from '@/data/sample';

/**
 * A recipe's picture. Uses real photography when `photoUrl` is set, otherwise
 * renders generated artwork (cuisine gradient + dish glyph) so the library
 * looks populated before any photos exist.
 */
export function RecipeImage({
  recipe,
  style,
  /** Glyph size — scale down for thumbnails, up for hero images. */
  glyph = 40,
  children,
}: {
  recipe: Recipe;
  style?: StyleProp<ViewStyle>;
  glyph?: number;
  children?: React.ReactNode;
}) {
  const photo = recipePhoto(recipe);

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: photo.colors[1] }, style]}>
      {photo.photoUrl ? (
        <Image
          source={{ uri: photo.photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          accessibilityLabel={recipe.title}
        />
      ) : (
        <>
          <LinearGradient
            colors={photo.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ fontSize: glyph, opacity: 0.9 }}>
              {photo.emoji}
            </Text>
          </View>
        </>
      )}
      {children}
    </View>
  );
}
