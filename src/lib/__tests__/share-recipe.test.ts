import type { Recipe } from '@/data/sample';
import { recipeShareText, shareSignOff } from '@/lib/share-recipe';

/**
 * Share used to send a bare "Check out X on Asepo" with nothing actionable in
 * it. These pin the two things that fixed: the recipient gets the actual
 * recipe, and every share carries the app invite.
 */

const recipe = {
  id: 'r-1',
  title: 'Cheese omelette',
  minutes: 30,
  servings: 2,
  ingredients: [
    { qty: '3', unit: '', name: 'eggs' },
    { qty: '30', unit: 'g', name: 'cheddar' },
    { qty: '', unit: '', name: 'butter' },
  ],
  instructions: ['Beat eggs.', 'Cook in butter.'],
} as unknown as Recipe;

const base = { ingredients: recipe.ingredients, servings: 2, factor: 1, metric: false };

describe('recipeShareText', () => {
  it('sends the whole recipe, not just a title', () => {
    const text = recipeShareText(recipe, base);

    expect(text).toContain('Cheese omelette');
    expect(text).toContain('30 min · Serves 2');
    expect(text).toContain('• 3 eggs');
    expect(text).toContain('• 30 g cheddar');
    expect(text).toContain('1. Beat eggs.');
    expect(text).toContain('2. Cook in butter.');
  });

  it('scales quantities to the servings the user chose', () => {
    const text = recipeShareText(recipe, { ...base, servings: 4, factor: 2 });

    expect(text).toContain('Serves 4');
    expect(text).toContain('• 6 eggs');
    expect(text).toContain('• 60 g cheddar');
  });

  it('leaves an unquantified ingredient clean, with no stray spacing', () => {
    const text = recipeShareText(recipe, base);

    expect(text).toContain('• butter');
    expect(text).not.toMatch(/• {2,}/);
    expect(text).not.toContain('•  butter');
  });

  it('sends what is on screen, so a healthier swap shares the swap', () => {
    const healthier = [{ qty: '3', unit: '', name: 'egg whites' }];
    const text = recipeShareText(recipe, { ...base, ingredients: healthier });

    expect(text).toContain('• 3 egg whites');
    expect(text).not.toContain('• 3 eggs');
  });

  it('omits a section rather than printing an empty heading', () => {
    const bare = { ...recipe, instructions: [] } as unknown as Recipe;
    const text = recipeShareText(bare, { ...base, ingredients: [] });

    expect(text).not.toContain('Ingredients');
    expect(text).not.toContain('Steps');
    expect(text).toContain('Cheese omelette');
  });
});

describe('the app invite', () => {
  it('is appended to every shared recipe', () => {
    expect(recipeShareText(recipe, base)).toContain(shareSignOff());
  });

  it('names the app and asks the recipient to get it', () => {
    const signOff = shareSignOff();

    expect(signOff).toContain('Asepo');
    expect(signOff).toMatch(/get/i);
  });

  it('never ships a dead link while APP_DOWNLOAD_URL is unset', () => {
    // The Play listing does not exist yet. Until it does the invite must read
    // without a URL rather than pointing at nothing.
    expect(shareSignOff()).not.toMatch(/https?:\/\/\s*$/);
    expect(shareSignOff()).not.toContain('undefined');
  });
});
