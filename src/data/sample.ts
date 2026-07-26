/**
 * Sample content mirroring the design prototype. This is placeholder data —
 * it gets replaced by the real API layer when the backend lands.
 */

export type Ingredient = { qty: string; unit: string; name: string };

export type Recipe = {
  id: string;
  title: string;
  /** Total time in minutes — display strings come from timeLabel(). */
  minutes: number;
  calories: number;
  servings: number;
  favorite: boolean;
  cuisine: string;
  mealType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  diets: string[];
  tags: string[];
  /** Cookbook ids this recipe belongs to. */
  cookbooks: string[];
  rating: number;
  cookedCount: number;
  /** Sort key for "Recently added" — higher is newer. */
  addedAt: number;
  source: { handle: string; platform: string };
  ingredients: Ingredient[];
  instructions: string[];
  /**
   * Real photography, once it exists. While this is undefined the UI falls back
   * to generated artwork from recipePhoto() below.
   */
  photoUrl?: string;
};

export const timeLabel = (r: Recipe) => `${r.minutes} min`;
export const calLabel = (r: Recipe) => `${r.calories} cal`;

/**
 * The "25 min · 520 cal" line under a recipe card.
 *
 * Imported recipes often have no calorie data — a TikTok caption rarely states
 * it — and rendering "0 cal" reads as a claim rather than an absence.
 */
export const metaLine = (r: Recipe) =>
  r.calories > 0 ? `${timeLabel(r)} · ${calLabel(r)}` : timeLabel(r);

export const WELCOME_PAGES = [
  {
    headline: 'Save any recipe',
    body: 'Import from TikTok, Instagram, or any website in one tap.',
    image: require('../../assets/images/save-any-recipe.png'),
  },
  {
    headline: 'Plan your week',
    body: 'Drag recipes onto your calendar and never wonder what’s for dinner.',
    image: require('../../assets/images/plan-your-week.png'),
  },
  {
    headline: 'Shop smarter',
    body: 'We build your grocery list automatically, grouped by aisle.',
    image: require('../../assets/images/shop-smarter.png'),
  },
];

export const Q1_OPTIONS = [
  { id: 'organize', label: 'Organize my recipes' },
  { id: 'plan', label: 'Plan meals' },
  { id: 'healthy', label: 'Eat healthier' },
  { id: 'save', label: 'Save money' },
  { id: 'cook', label: 'Cook more' },
];

export const DIET_OPTIONS = [
  'None',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Kosher',
];

export const ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Eggs',
  'Soy',
  'Gluten',
  'Dairy',
  'Sesame',
];

export const BENEFITS = [
  'Unlimited recipe imports',
  'Video & photo import',
  'Nutrition for every recipe',
  'Meal planning',
  'Shared grocery lists',
  'Cloud backup',
];

export type Plan = {
  id: string;
  name: string;
  price: string;
  sub: string;
  badge: string | null;
};

export const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monthly', price: '$4.99', sub: 'per month', badge: null },
  { id: 'annual', name: 'Annual', price: '$39.99', sub: 'per year · $3.33/mo', badge: 'Save 33%' },
  { id: 'lifetime', name: 'Lifetime', price: '$79.99', sub: 'one-time purchase', badge: null },
];

export const ADD_TILES = [
  { id: 'scan', label: 'Scan a photo', icon: 'camera' },
  { id: 'library', label: 'Photo library', icon: 'library' },
  { id: 'paste', label: 'Paste text', icon: 'paste' },
  { id: 'idea', label: 'Type a meal', icon: 'write' },
  { id: 'app', label: 'Import from another app', icon: 'app' },
] as const;

export const LIMIT_BENEFITS = [
  'Unlimited recipe imports',
  'Video & photo import',
  'Priority processing',
];

/* ------------------------------------------------------------------ *
 * Recipes
 * ------------------------------------------------------------------ */

export const RECIPE_SAMPLES: Recipe[] = [
  {
    id: 'r1',
    title: 'Miso-Glazed Salmon Bowl',
    minutes: 25,
    calories: 520,
    servings: 4,
    favorite: true,
    cuisine: 'Japanese',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Pescatarian', 'Dairy-free'],
    tags: ['Quick', 'High protein', 'Meal prep'],
    cookbooks: ['weeknight', 'meal-prep'],
    rating: 5,
    cookedCount: 12,
    addedAt: 24,
    source: { handle: '@denise.cooks', platform: 'TikTok' },
    ingredients: [
      { qty: '4', unit: 'fillets', name: 'salmon' },
      { qty: '3', unit: 'tbsp', name: 'white miso paste' },
      { qty: '2', unit: 'tbsp', name: 'mirin' },
      { qty: '1', unit: 'tbsp', name: 'soy sauce' },
      { qty: '2', unit: 'cups', name: 'short-grain rice' },
      { qty: '1', unit: '', name: 'cucumber, sliced' },
      { qty: '2', unit: 'tsp', name: 'toasted sesame seeds' },
    ],
    instructions: [
      'Whisk miso, mirin and soy sauce into a glaze.',
      'Brush over salmon and rest for 10 minutes.',
      'Broil 8–10 minutes until caramelised and just cooked through.',
      'Serve over rice with cucumber and a scatter of sesame seeds.',
    ],
  },
  {
    id: 'r2',
    title: 'Creamy Tomato Orzo',
    minutes: 20,
    calories: 410,
    servings: 2,
    favorite: false,
    cuisine: 'Italian',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Vegetarian'],
    tags: ['Quick', 'One pot', 'Comfort food'],
    cookbooks: ['weeknight'],
    rating: 4,
    cookedCount: 6,
    addedAt: 23,
    source: { handle: '@pastanight', platform: 'Instagram' },
    ingredients: [
      { qty: '1', unit: 'cup', name: 'orzo' },
      { qty: '2', unit: 'tbsp', name: 'tomato paste' },
      { qty: '1/2', unit: 'cup', name: 'heavy cream' },
      { qty: '2', unit: 'cloves', name: 'garlic, minced' },
      { qty: '2', unit: 'cups', name: 'vegetable stock' },
      { qty: '1/4', unit: 'cup', name: 'grated parmesan' },
    ],
    instructions: [
      'Soften garlic in olive oil, then fry the tomato paste for a minute.',
      'Add orzo and stock, simmer 10 minutes until almost absorbed.',
      'Stir through cream and parmesan, season and serve.',
    ],
  },
  {
    id: 'r3',
    title: 'Crispy Chickpea Tacos',
    minutes: 30,
    calories: 380,
    servings: 4,
    favorite: true,
    cuisine: 'Mexican',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Vegan', 'Vegetarian', 'Dairy-free'],
    tags: ['Budget', 'One pot'],
    cookbooks: ['weeknight'],
    rating: 5,
    cookedCount: 9,
    addedAt: 22,
    source: { handle: '@plantplate', platform: 'TikTok' },
    ingredients: [
      { qty: '2', unit: 'cans', name: 'chickpeas, drained' },
      { qty: '2', unit: 'tsp', name: 'smoked paprika' },
      { qty: '1', unit: 'tsp', name: 'ground cumin' },
      { qty: '8', unit: '', name: 'corn tortillas' },
      { qty: '1', unit: '', name: 'avocado' },
      { qty: '1', unit: '', name: 'lime' },
    ],
    instructions: [
      'Toss chickpeas with oil and spices.',
      'Roast at 425°F for 22 minutes until crisp.',
      'Warm tortillas, fill with chickpeas, avocado and a squeeze of lime.',
    ],
  },
  {
    id: 'r4',
    title: 'Lemon Herb Roast Chicken',
    minutes: 55,
    calories: 610,
    servings: 6,
    favorite: false,
    cuisine: 'Mediterranean',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Gluten-free', 'Dairy-free', 'Paleo'],
    tags: ['Sunday', 'Crowd pleaser'],
    cookbooks: ['entertaining'],
    rating: 5,
    cookedCount: 4,
    addedAt: 21,
    source: { handle: 'seriouseats.com', platform: 'Web' },
    ingredients: [
      { qty: '1', unit: '', name: 'whole chicken' },
      { qty: '2', unit: '', name: 'lemons' },
      { qty: '4', unit: 'sprigs', name: 'thyme' },
      { qty: '3', unit: 'tbsp', name: 'olive oil' },
      { qty: '1', unit: 'head', name: 'garlic, halved' },
    ],
    instructions: [
      'Pat the chicken dry and season generously inside and out.',
      'Stuff with lemon halves, garlic and thyme.',
      'Roast at 425°F for 50 minutes, basting once.',
      'Rest 15 minutes before carving.',
    ],
  },
  {
    id: 'r5',
    title: 'Charred Corn Salad',
    minutes: 15,
    calories: 220,
    servings: 2,
    favorite: false,
    cuisine: 'Mexican',
    mealType: 'Lunch',
    difficulty: 'Easy',
    diets: ['Vegetarian', 'Gluten-free'],
    tags: ['Quick', 'Summer'],
    cookbooks: [],
    rating: 4,
    cookedCount: 3,
    addedAt: 20,
    source: { handle: '@grillseason', platform: 'Instagram' },
    ingredients: [
      { qty: '4', unit: 'ears', name: 'corn' },
      { qty: '1/4', unit: 'cup', name: 'crumbled feta' },
      { qty: '1', unit: '', name: 'lime' },
      { qty: '2', unit: 'tbsp', name: 'chopped cilantro' },
      { qty: '1/2', unit: 'tsp', name: 'chilli powder' },
    ],
    instructions: [
      'Char corn over a high flame until blistered in spots.',
      'Cut kernels from the cob.',
      'Toss warm with lime, feta, cilantro and chilli.',
    ],
  },
  {
    id: 'r6',
    title: 'Brown Butter Chocolate Chip Cookies',
    minutes: 35,
    calories: 190,
    servings: 12,
    favorite: true,
    cuisine: 'American',
    mealType: 'Dessert',
    difficulty: 'Medium',
    diets: ['Vegetarian'],
    tags: ['Baking', 'Comfort food'],
    cookbooks: ['baking'],
    rating: 5,
    cookedCount: 15,
    addedAt: 19,
    source: { handle: '@butterbaked', platform: 'TikTok' },
    ingredients: [
      { qty: '1/2', unit: 'cup', name: 'unsalted butter' },
      { qty: '1', unit: 'cup', name: 'brown sugar' },
      { qty: '2', unit: 'cups', name: 'all-purpose flour' },
      { qty: '1', unit: 'tsp', name: 'baking soda' },
      { qty: '2', unit: '', name: 'eggs' },
      { qty: '1.5', unit: 'cups', name: 'dark chocolate chips' },
    ],
    instructions: [
      'Brown the butter until nutty, then cool slightly.',
      'Beat with sugar, then eggs one at a time.',
      'Fold in dry ingredients and chocolate.',
      'Bake at 350°F for 11–13 minutes.',
    ],
  },
  {
    id: 'r7',
    title: 'Green Shakshuka',
    minutes: 25,
    calories: 340,
    servings: 3,
    favorite: false,
    cuisine: 'Mediterranean',
    mealType: 'Breakfast',
    difficulty: 'Easy',
    diets: ['Vegetarian', 'Gluten-free'],
    tags: ['One pot', 'High protein'],
    cookbooks: ['weeknight'],
    rating: 4,
    cookedCount: 5,
    addedAt: 18,
    source: { handle: '@brunchclub', platform: 'Instagram' },
    ingredients: [
      { qty: '6', unit: 'cups', name: 'baby spinach' },
      { qty: '1', unit: 'bunch', name: 'kale, stripped' },
      { qty: '4', unit: '', name: 'eggs' },
      { qty: '1', unit: '', name: 'onion, sliced' },
      { qty: '1', unit: 'tsp', name: 'ground coriander' },
      { qty: '1/3', unit: 'cup', name: 'feta' },
    ],
    instructions: [
      'Soften onion with the spices.',
      'Wilt greens down until glossy, season well.',
      'Make wells, crack in eggs, cover and cook 6 minutes.',
      'Finish with crumbled feta.',
    ],
  },
  {
    id: 'r8',
    title: 'Weeknight Pad Thai',
    minutes: 25,
    calories: 560,
    servings: 4,
    favorite: false,
    cuisine: 'Thai',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Dairy-free'],
    tags: ['Quick', 'Takeout at home'],
    cookbooks: ['weeknight'],
    rating: 4,
    cookedCount: 7,
    addedAt: 17,
    source: { handle: '@wokweekly', platform: 'YouTube' },
    ingredients: [
      { qty: '8', unit: 'oz', name: 'rice noodles' },
      { qty: '3', unit: 'tbsp', name: 'tamarind paste' },
      { qty: '2', unit: 'tbsp', name: 'fish sauce' },
      { qty: '2', unit: '', name: 'eggs' },
      { qty: '1', unit: 'cup', name: 'bean sprouts' },
      { qty: '1/3', unit: 'cup', name: 'crushed peanuts' },
    ],
    instructions: [
      'Soak noodles until pliable.',
      'Scramble eggs in a hot wok, push aside.',
      'Add noodles and sauce, toss hard for 2 minutes.',
      'Finish with sprouts, peanuts and lime.',
    ],
  },
  {
    id: 'r9',
    title: 'Overnight Oats, Four Ways',
    minutes: 10,
    calories: 310,
    servings: 4,
    favorite: false,
    cuisine: 'American',
    mealType: 'Breakfast',
    difficulty: 'Easy',
    diets: ['Vegetarian'],
    tags: ['Meal prep', 'Quick', 'Budget'],
    cookbooks: ['meal-prep'],
    rating: 4,
    cookedCount: 20,
    addedAt: 16,
    source: { handle: '@mealprepdaily', platform: 'TikTok' },
    ingredients: [
      { qty: '2', unit: 'cups', name: 'rolled oats' },
      { qty: '2', unit: 'cups', name: 'milk of choice' },
      { qty: '4', unit: 'tbsp', name: 'chia seeds' },
      { qty: '4', unit: 'tsp', name: 'maple syrup' },
    ],
    instructions: [
      'Divide oats, chia and milk between four jars.',
      'Sweeten, stir well and refrigerate overnight.',
      'Top with fruit, nut butter, cocoa or jam in the morning.',
    ],
  },
  {
    id: 'r10',
    title: 'Sheet Pan Harissa Cauliflower',
    minutes: 40,
    calories: 290,
    servings: 4,
    favorite: false,
    cuisine: 'Mediterranean',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free'],
    tags: ['One pan', 'Budget'],
    cookbooks: ['weeknight', 'meal-prep'],
    rating: 4,
    cookedCount: 8,
    addedAt: 15,
    source: { handle: '@sheetpansuppers', platform: 'Instagram' },
    ingredients: [
      { qty: '1', unit: 'head', name: 'cauliflower, in florets' },
      { qty: '2', unit: 'tbsp', name: 'harissa paste' },
      { qty: '1', unit: 'can', name: 'chickpeas' },
      { qty: '3', unit: 'tbsp', name: 'olive oil' },
      { qty: '1/2', unit: 'cup', name: 'coconut yoghurt' },
    ],
    instructions: [
      'Toss cauliflower and chickpeas with harissa and oil.',
      'Roast at 425°F for 30 minutes, turning halfway.',
      'Serve over yoghurt with plenty of lemon.',
    ],
  },
  {
    id: 'r11',
    title: 'Cacio e Pepe',
    minutes: 15,
    calories: 480,
    servings: 2,
    favorite: true,
    cuisine: 'Italian',
    mealType: 'Dinner',
    difficulty: 'Hard',
    diets: ['Vegetarian'],
    tags: ['Quick', 'Comfort food'],
    cookbooks: ['weeknight'],
    rating: 5,
    cookedCount: 11,
    addedAt: 14,
    source: { handle: '@romanplates', platform: 'YouTube' },
    ingredients: [
      { qty: '8', unit: 'oz', name: 'tonnarelli' },
      { qty: '1', unit: 'cup', name: 'grated pecorino' },
      { qty: '2', unit: 'tsp', name: 'cracked black pepper' },
    ],
    instructions: [
      'Toast the pepper in a dry pan.',
      'Cook pasta in minimal water for starchy liquid.',
      'Emulsify pecorino with pasta water off the heat, then toss.',
    ],
  },
  {
    id: 'r12',
    title: 'Korean Beef Bowls',
    minutes: 20,
    calories: 540,
    servings: 4,
    favorite: false,
    cuisine: 'Japanese',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Dairy-free'],
    tags: ['Quick', 'High protein', 'Meal prep'],
    cookbooks: ['meal-prep', 'weeknight'],
    rating: 4,
    cookedCount: 10,
    addedAt: 13,
    source: { handle: '@20minutedinners', platform: 'TikTok' },
    ingredients: [
      { qty: '1', unit: 'lb', name: 'ground beef' },
      { qty: '3', unit: 'tbsp', name: 'soy sauce' },
      { qty: '2', unit: 'tbsp', name: 'brown sugar' },
      { qty: '1', unit: 'tbsp', name: 'sesame oil' },
      { qty: '3', unit: 'cloves', name: 'garlic' },
      { qty: '4', unit: 'cups', name: 'cooked rice' },
    ],
    instructions: [
      'Brown the beef hard, breaking it up.',
      'Add garlic, soy, sugar and sesame oil, bubble 3 minutes.',
      'Spoon over rice with pickles and spring onion.',
    ],
  },
  {
    id: 'r13',
    title: 'Roasted Tomato Soup',
    minutes: 45,
    calories: 240,
    servings: 4,
    favorite: false,
    cuisine: 'American',
    mealType: 'Lunch',
    difficulty: 'Easy',
    diets: ['Vegan', 'Vegetarian', 'Gluten-free'],
    tags: ['Comfort food', 'Budget', 'Freezes well'],
    cookbooks: ['meal-prep'],
    rating: 4,
    cookedCount: 6,
    addedAt: 12,
    source: { handle: 'smittenkitchen.com', platform: 'Web' },
    ingredients: [
      { qty: '3', unit: 'lbs', name: 'ripe tomatoes' },
      { qty: '1', unit: '', name: 'onion, quartered' },
      { qty: '4', unit: 'cloves', name: 'garlic' },
      { qty: '3', unit: 'tbsp', name: 'olive oil' },
      { qty: '1', unit: 'handful', name: 'basil' },
    ],
    instructions: [
      'Roast tomatoes, onion and garlic at 400°F for 35 minutes.',
      'Blend with basil until smooth.',
      'Loosen with stock and season aggressively.',
    ],
  },
  {
    id: 'r14',
    title: 'Air Fryer Halloumi Bites',
    minutes: 12,
    calories: 260,
    servings: 2,
    favorite: false,
    cuisine: 'Mediterranean',
    mealType: 'Snack',
    difficulty: 'Easy',
    diets: ['Vegetarian', 'Gluten-free'],
    tags: ['Air fryer', 'Quick'],
    cookbooks: ['entertaining'],
    rating: 4,
    cookedCount: 5,
    addedAt: 11,
    source: { handle: '@airfryeraddict', platform: 'TikTok' },
    ingredients: [
      { qty: '9', unit: 'oz', name: 'halloumi, cubed' },
      { qty: '1', unit: 'tbsp', name: 'olive oil' },
      { qty: '1', unit: 'tsp', name: 'dried oregano' },
      { qty: '2', unit: 'tbsp', name: 'hot honey' },
    ],
    instructions: [
      'Toss halloumi with oil and oregano.',
      'Air fry at 400°F for 8 minutes, shaking once.',
      'Drizzle with hot honey and eat immediately.',
    ],
  },
  {
    id: 'r15',
    title: 'Coconut Chicken Curry',
    minutes: 40,
    calories: 590,
    servings: 4,
    favorite: false,
    cuisine: 'Thai',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Gluten-free', 'Dairy-free'],
    tags: ['One pot', 'Freezes well'],
    cookbooks: ['meal-prep'],
    rating: 5,
    cookedCount: 9,
    addedAt: 10,
    source: { handle: '@currynight', platform: 'YouTube' },
    ingredients: [
      { qty: '1.5', unit: 'lbs', name: 'chicken thighs' },
      { qty: '3', unit: 'tbsp', name: 'red curry paste' },
      { qty: '1', unit: 'can', name: 'coconut milk' },
      { qty: '1', unit: 'tbsp', name: 'fish sauce' },
      { qty: '1', unit: '', name: 'red pepper, sliced' },
      { qty: '1', unit: 'handful', name: 'thai basil' },
    ],
    instructions: [
      'Fry the curry paste until fragrant and split.',
      'Add chicken and coat, then pour in coconut milk.',
      'Simmer 25 minutes, add pepper for the last 8.',
      'Finish with fish sauce, lime and basil.',
    ],
  },
  {
    id: 'r16',
    title: 'Smashed Cucumber Salad',
    minutes: 10,
    calories: 120,
    servings: 2,
    favorite: false,
    cuisine: 'Japanese',
    mealType: 'Snack',
    difficulty: 'Easy',
    diets: ['Vegan', 'Vegetarian', 'Dairy-free'],
    tags: ['Quick', 'Spicy'],
    cookbooks: [],
    rating: 4,
    cookedCount: 4,
    addedAt: 9,
    source: { handle: '@sidedishsunday', platform: 'Instagram' },
    ingredients: [
      { qty: '2', unit: '', name: 'cucumbers' },
      { qty: '1', unit: 'tbsp', name: 'rice vinegar' },
      { qty: '2', unit: 'tsp', name: 'chilli crisp' },
      { qty: '1', unit: 'tsp', name: 'sesame oil' },
    ],
    instructions: [
      'Smash cucumbers with the flat of a knife, tear into pieces.',
      'Salt for 10 minutes, then drain.',
      'Dress with vinegar, chilli crisp and sesame oil.',
    ],
  },
  {
    id: 'r17',
    title: 'Mushroom Ragu Pappardelle',
    minutes: 50,
    calories: 520,
    servings: 4,
    favorite: true,
    cuisine: 'Italian',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Vegetarian'],
    tags: ['Comfort food', 'Sunday'],
    cookbooks: ['entertaining'],
    rating: 5,
    cookedCount: 3,
    addedAt: 8,
    source: { handle: '@slowsundays', platform: 'Instagram' },
    ingredients: [
      { qty: '1', unit: 'lb', name: 'mixed mushrooms' },
      { qty: '1/2', unit: 'oz', name: 'dried porcini' },
      { qty: '1', unit: 'cup', name: 'red wine' },
      { qty: '2', unit: 'tbsp', name: 'tomato paste' },
      { qty: '12', unit: 'oz', name: 'pappardelle' },
    ],
    instructions: [
      'Rehydrate porcini, keep the liquid.',
      'Brown mushrooms in batches until deeply coloured.',
      'Deglaze with wine, add paste and porcini liquor, simmer 30 minutes.',
      'Toss with pasta and a knob of butter.',
    ],
  },
  {
    id: 'r18',
    title: 'Banana Walnut Bread',
    minutes: 65,
    calories: 280,
    servings: 10,
    favorite: false,
    cuisine: 'American',
    mealType: 'Dessert',
    difficulty: 'Easy',
    diets: ['Vegetarian'],
    tags: ['Baking', 'Budget'],
    cookbooks: ['baking'],
    rating: 4,
    cookedCount: 7,
    addedAt: 7,
    source: { handle: '@bakewithme', platform: 'TikTok' },
    ingredients: [
      { qty: '3', unit: '', name: 'very ripe bananas' },
      { qty: '1/2', unit: 'cup', name: 'melted butter' },
      { qty: '3/4', unit: 'cup', name: 'sugar' },
      { qty: '1.5', unit: 'cups', name: 'flour' },
      { qty: '1', unit: 'cup', name: 'walnuts, chopped' },
    ],
    instructions: [
      'Mash bananas, mix with butter, sugar and egg.',
      'Fold in flour and walnuts until just combined.',
      'Bake at 350°F for 55 minutes.',
    ],
  },
  {
    id: 'r19',
    title: 'Steak Tacos with Salsa Verde',
    minutes: 30,
    calories: 610,
    servings: 4,
    favorite: false,
    cuisine: 'Mexican',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Gluten-free', 'Dairy-free'],
    tags: ['Crowd pleaser', 'High protein'],
    cookbooks: ['entertaining'],
    rating: 5,
    cookedCount: 6,
    addedAt: 6,
    source: { handle: '@tacotuesday', platform: 'Instagram' },
    ingredients: [
      { qty: '1.5', unit: 'lbs', name: 'skirt steak' },
      { qty: '8', unit: '', name: 'tomatillos' },
      { qty: '1', unit: '', name: 'jalapeño' },
      { qty: '12', unit: '', name: 'corn tortillas' },
      { qty: '1', unit: '', name: 'white onion, diced' },
    ],
    instructions: [
      'Char tomatillos and jalapeño, then blitz into salsa.',
      'Sear steak hard, 3 minutes a side, rest 10.',
      'Slice against the grain and pile into warm tortillas.',
    ],
  },
  {
    id: 'r20',
    title: 'Lentil Shepherd’s Pie',
    minutes: 60,
    calories: 430,
    servings: 6,
    favorite: false,
    cuisine: 'American',
    mealType: 'Dinner',
    difficulty: 'Medium',
    diets: ['Vegan', 'Vegetarian', 'Dairy-free'],
    tags: ['Comfort food', 'Freezes well', 'Budget'],
    cookbooks: ['meal-prep'],
    rating: 4,
    cookedCount: 5,
    addedAt: 5,
    source: { handle: 'bbcgoodfood.com', platform: 'Web' },
    ingredients: [
      { qty: '2', unit: 'cups', name: 'green lentils' },
      { qty: '3', unit: '', name: 'carrots, diced' },
      { qty: '2', unit: 'lbs', name: 'potatoes' },
      { qty: '2', unit: 'tbsp', name: 'tomato paste' },
      { qty: '2', unit: 'tsp', name: 'thyme' },
    ],
    instructions: [
      'Simmer lentils with carrots, paste and thyme until thick.',
      'Boil and mash potatoes with olive oil.',
      'Top the filling, rough up the surface and bake 25 minutes at 400°F.',
    ],
  },
  {
    id: 'r21',
    title: 'Blueberry Ricotta Pancakes',
    minutes: 25,
    calories: 390,
    servings: 4,
    favorite: true,
    cuisine: 'American',
    mealType: 'Breakfast',
    difficulty: 'Easy',
    diets: ['Vegetarian'],
    tags: ['Weekend', 'Comfort food'],
    cookbooks: ['baking'],
    rating: 5,
    cookedCount: 8,
    addedAt: 4,
    source: { handle: '@pancakesunday', platform: 'TikTok' },
    ingredients: [
      { qty: '1', unit: 'cup', name: 'ricotta' },
      { qty: '1', unit: 'cup', name: 'flour' },
      { qty: '2', unit: '', name: 'eggs, separated' },
      { qty: '1', unit: 'cup', name: 'blueberries' },
      { qty: '1', unit: 'tsp', name: 'baking powder' },
    ],
    instructions: [
      'Whisk yolks with ricotta and milk, fold in dry ingredients.',
      'Whip whites to soft peaks and fold through.',
      'Griddle in butter, dotting blueberries onto each pancake.',
    ],
  },
  {
    id: 'r22',
    title: 'Sesame Soba Noodle Salad',
    minutes: 18,
    calories: 350,
    servings: 3,
    favorite: false,
    cuisine: 'Japanese',
    mealType: 'Lunch',
    difficulty: 'Easy',
    diets: ['Vegan', 'Vegetarian', 'Dairy-free'],
    tags: ['Meal prep', 'Quick'],
    cookbooks: ['meal-prep'],
    rating: 4,
    cookedCount: 9,
    addedAt: 3,
    source: { handle: '@lunchboxed', platform: 'Instagram' },
    ingredients: [
      { qty: '9', unit: 'oz', name: 'soba noodles' },
      { qty: '3', unit: 'tbsp', name: 'tahini' },
      { qty: '2', unit: 'tbsp', name: 'soy sauce' },
      { qty: '1', unit: 'tbsp', name: 'rice vinegar' },
      { qty: '2', unit: '', name: 'carrots, julienned' },
      { qty: '4', unit: '', name: 'spring onions' },
    ],
    instructions: [
      'Cook and rinse soba until cold.',
      'Whisk tahini, soy and vinegar with a splash of water.',
      'Toss everything together and chill until needed.',
    ],
  },
  {
    id: 'r23',
    title: 'Garlic Butter Shrimp',
    minutes: 15,
    calories: 330,
    servings: 3,
    favorite: false,
    cuisine: 'Mediterranean',
    mealType: 'Dinner',
    difficulty: 'Easy',
    diets: ['Pescatarian', 'Gluten-free', 'Keto'],
    tags: ['Quick', 'High protein'],
    cookbooks: ['weeknight'],
    rating: 5,
    cookedCount: 7,
    addedAt: 2,
    source: { handle: '@15minutemeals', platform: 'TikTok' },
    ingredients: [
      { qty: '1', unit: 'lb', name: 'large shrimp' },
      { qty: '4', unit: 'tbsp', name: 'butter' },
      { qty: '5', unit: 'cloves', name: 'garlic, sliced' },
      { qty: '1/4', unit: 'cup', name: 'white wine' },
      { qty: '2', unit: 'tbsp', name: 'parsley' },
    ],
    instructions: [
      'Sear shrimp 90 seconds a side, remove.',
      'Soften garlic in butter, deglaze with wine.',
      'Return shrimp, toss with parsley and lemon.',
    ],
  },
  {
    id: 'r24',
    title: 'Chocolate Olive Oil Cake',
    minutes: 50,
    calories: 340,
    servings: 8,
    favorite: false,
    cuisine: 'Italian',
    mealType: 'Dessert',
    difficulty: 'Easy',
    diets: ['Vegetarian', 'Dairy-free'],
    tags: ['Baking', 'Crowd pleaser'],
    cookbooks: ['baking', 'entertaining'],
    rating: 5,
    cookedCount: 4,
    addedAt: 1,
    source: { handle: 'nigella.com', platform: 'Web' },
    ingredients: [
      { qty: '3/4', unit: 'cup', name: 'olive oil' },
      { qty: '1/2', unit: 'cup', name: 'cocoa powder' },
      { qty: '1', unit: 'cup', name: 'sugar' },
      { qty: '3', unit: '', name: 'eggs' },
      { qty: '1.5', unit: 'cups', name: 'ground almonds' },
    ],
    instructions: [
      'Whisk cocoa with boiling water into a paste, cool.',
      'Beat oil, sugar and eggs until thick.',
      'Fold in almonds and cocoa, bake at 340°F for 40 minutes.',
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Cookbooks — counts derive from membership so they never drift.
 * ------------------------------------------------------------------ */

/** A cookbook as stored. `count` is derived from recipe membership, never stored. */
export type StoredCookbook = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
};

export type Cookbook = StoredCookbook & { count: number };

/** Seeds a fresh install. Afterwards cookbooks live in the store. */
export const COOKBOOK_SEED: StoredCookbook[] = [
  { id: 'weeknight', name: 'Weeknight Dinners' },
  { id: 'baking', name: 'Baking Projects' },
  { id: 'meal-prep', name: 'Meal Prep' },
  { id: 'entertaining', name: 'Entertaining' },
];

/* ------------------------------------------------------------------ *
 * Filter / search vocabularies, derived from the recipes above
 * ------------------------------------------------------------------ */

const unique = (values: string[]) => [...new Set(values)].sort();

export const CUISINE_OPTIONS = unique(RECIPE_SAMPLES.map((r) => r.cuisine));
export const MEAL_TYPE_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
export const SORT_OPTIONS = ['Recently added', 'A–Z', 'Cook time', 'Rating', 'Most cooked'];
export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

/** Every distinct ingredient name, for the "ingredients I have" search. */
export const ALL_INGREDIENTS = unique(
  RECIPE_SAMPLES.flatMap((r) => r.ingredients.map((i) => i.name.split(',')[0].trim()))
);

export const ALL_TAGS = unique(RECIPE_SAMPLES.flatMap((r) => r.tags));

export const COOKBOOK_COLORS = ['#C2410C', '#B45309', '#166534', '#1D4ED8', '#7C3AED'];
export const COOKBOOK_EMOJIS = ['📖', '🍰', '🥗', '🍜', '🍳', '🎉'];

export const RECENT_SEARCHES = ['salmon bowl', 'pasta', '30 minute dinners', 'vegan'];
export const SUGGESTED_SEARCHES = [
  'Quick lunches',
  'High protein',
  'One pot meals',
  'Air fryer',
  'Comfort food',
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Which meal slots are filled per day — drives the dots on the Home week strip. */
export const MEAL_FILL = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
  [1, 1, 1],
  [1, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

/** The import review screen still edits this fixture. */
export const SAMPLE_INGREDIENTS = RECIPE_SAMPLES[0].ingredients;
export const SAMPLE_INSTRUCTIONS = RECIPE_SAMPLES[0].instructions;

/* ------------------------------------------------------------------ *
 * Generated recipe artwork
 *
 * Stand-in for photography: a cuisine-derived gradient plus a dish glyph,
 * so every card reads differently in a grid. Rendered by <RecipeImage>.
 * Setting `photoUrl` on a recipe overrides all of this.
 * ------------------------------------------------------------------ */

/** Gradient stops per cuisine — warm, food-adjacent, distinct at thumbnail size. */
const CUISINE_GRADIENTS: Record<string, [string, string]> = {
  Japanese: ['#1E3A5F', '#0F2438'],
  Italian: ['#8C2F1B', '#4A1710'],
  Mexican: ['#B4451C', '#6B2410'],
  Mediterranean: ['#3F6B44', '#1F3A25'],
  Thai: ['#116B5C', '#083D34'],
  American: ['#7A4A25', '#432716'],
};

const FALLBACK_GRADIENT: [string, string] = ['#5a4230', '#443124'];

const RECIPE_EMOJI: Record<string, string> = {
  r1: '🍣',
  r2: '🍝',
  r3: '🌮',
  r4: '🍗',
  r5: '🌽',
  r6: '🍪',
  r7: '🍳',
  r8: '🍜',
  r9: '🥣',
  r10: '🥬',
  r11: '🧀',
  r12: '🥩',
  r13: '🍅',
  r14: '🧆',
  r15: '🍛',
  r16: '🥒',
  r17: '🍄',
  r18: '🍌',
  r19: '🥙',
  r20: '🥧',
  r21: '🥞',
  r22: '🍲',
  r23: '🍤',
  r24: '🍫',
};

export type RecipePhoto = {
  colors: [string, string];
  emoji: string;
  photoUrl?: string;
};

export function recipePhoto(r: Recipe): RecipePhoto {
  return {
    colors: CUISINE_GRADIENTS[r.cuisine] ?? FALLBACK_GRADIENT,
    emoji: RECIPE_EMOJI[r.id] ?? '🍽',
    photoUrl: r.photoUrl,
  };
}
