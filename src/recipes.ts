import type { FoodCategory, Ingredient, Recipe } from './types';

type Protein = {
  key: string;
  name: string;
  type: string;
  category: FoodCategory;
  grams: number;
  protein: number;
  calories: number;
  fat: number;
  price: number;
  allergens?: string[];
};

const proteins: Protein[] = [
  { key: 'kip', name: 'Kipfilet', type: 'Kip', category: 'Vlees & gevogelte', grams: 150, protein: 34, calories: 248, fat: 4, price: 2.1 },
  { key: 'kalkoen', name: 'Kalkoenfilet', type: 'Kalkoen', category: 'Vlees & gevogelte', grams: 150, protein: 35, calories: 218, fat: 2, price: 2.3 },
  { key: 'rund', name: 'Mager rundsvlees', type: 'Rund', category: 'Vlees & gevogelte', grams: 140, protein: 30, calories: 270, fat: 9, price: 2.7 },
  { key: 'zalm', name: 'Zalmfilet', type: 'Zalm', category: 'Vis', grams: 140, protein: 28, calories: 291, fat: 18, price: 3.2, allergens: ['Vis'] },
  { key: 'kabeljauw', name: 'Kabeljauwfilet', type: 'Witte vis', category: 'Vis', grams: 160, protein: 29, calories: 168, fat: 2, price: 2.8, allergens: ['Vis'] },
  { key: 'tonijn', name: 'Tonijn uit blik, uitgelekt', type: 'Witte vis', category: 'Vis', grams: 120, protein: 29, calories: 150, fat: 2, price: 1.5, allergens: ['Vis'] },
  { key: 'eieren', name: 'Eieren', type: 'Vegetarisch', category: 'Zuivel', grams: 120, protein: 16, calories: 172, fat: 12, price: 0.65, allergens: ['Ei'] },
  { key: 'kwark', name: 'Magere plattekaas', type: 'Vegetarisch', category: 'Zuivel', grams: 200, protein: 24, calories: 136, fat: 1, price: 0.8, allergens: ['Melk'] },
  { key: 'cottage', name: 'Hüttenkäse', type: 'Vegetarisch', category: 'Zuivel', grams: 180, protein: 22, calories: 177, fat: 8, price: 1.1, allergens: ['Melk'] },
  { key: 'linzen', name: 'Linzen, gekookt', type: 'Vegetarisch', category: 'Droge voeding', grams: 180, protein: 16, calories: 209, fat: 1, price: 0.65 },
];

type Carb = { name: string; type: string; amount: number; calories: number; protein: number; carbs: number; fat: number; category: FoodCategory };
const carbs: Carb[] = [
  { name: 'Zilvervliesrijst', type: 'Rijst', amount: 75, calories: 270, protein: 6, carbs: 57, fat: 2, category: 'Droge voeding' },
  { name: 'Volkoren pasta', type: 'Pasta', amount: 80, calories: 280, protein: 10, carbs: 54, fat: 2, category: 'Droge voeding' },
  { name: 'Zoete aardappel', type: 'Zoete aardappel', amount: 220, calories: 189, protein: 4, carbs: 44, fat: 0, category: 'Groenten' },
  { name: 'Volkoren wrap', type: 'Wrap', amount: 65, calories: 205, protein: 6, carbs: 34, fat: 5, category: 'Droge voeding' },
  { name: 'Couscous', type: 'Couscous', amount: 75, calories: 282, protein: 9, carbs: 58, fat: 1, category: 'Droge voeding' },
];

const vegetables = [
  ['Broccoli', 100], ['Paprika', 80], ['Courgette', 100], ['Spinazie', 60],
  ['Wortelen', 80], ['Champignons', 80], ['Boontjes', 90], ['Tomaten', 100],
  ['Erwten', 70], ['Ui', 50],
] as const;
const vegetablesByCarb = [
  [0, 1, 5], [2, 3, 7], [0, 4, 6], [1, 7, 9], [2, 5, 8],
];
const imageByProtein: Record<string, string> = {
  kip: 'photo-1532550907401-a500c9a57435',
  kalkoen: 'photo-1604503468506-a8da13d82791',
  rund: 'photo-1546833999-b9f581a1996d',
  zalm: 'photo-1467003909585-2f8a72700288',
  kabeljauw: 'photo-1519708227418-c8fd9a32b7a2',
  tonijn: 'photo-1519708227418-c8fd9a32b7a2',
  eieren: 'photo-1525351484163-7529414344d8',
  kwark: 'photo-1512621776951-a57141f2eefd',
  cottage: 'photo-1512621776951-a57141f2eefd',
  linzen: 'photo-1512621776951-a57141f2eefd',
};
const seasoning = [
  { name: 'Olijfolie', amount: 5, unit: 'ml' as const, category: 'Kruiden & sauzen' as const },
  { name: 'Knoflook', amount: 1, unit: 'stuks' as const, category: 'Groenten' as const },
  { name: 'Citroensap', amount: 10, unit: 'ml' as const, category: 'Kruiden & sauzen' as const },
  { name: 'Paprikapoeder', amount: 2, unit: 'g' as const, category: 'Kruiden & sauzen' as const },
  { name: 'Zout', amount: 1, unit: 'g' as const, category: 'Kruiden & sauzen' as const },
  { name: 'Zwarte peper', amount: 1, unit: 'g' as const, category: 'Kruiden & sauzen' as const },
];

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeRecipe(protein: Protein, carb: Carb, index: number): Recipe {
  const vegNames = vegetablesByCarb[carbs.indexOf(carb)];
  const selectedVegetables = [
    vegetables[vegNames[index % vegNames.length]],
    vegetables[vegNames[(index + 1) % vegNames.length]],
  ];
  const preparation = ['met', 'in een kruidige bowl met', 'uit de pan met', 'met verse groenten en'][index % 4];
  const name = `${titleCase(protein.name)} ${preparation} ${carb.type.toLowerCase()} & ${selectedVegetables[0][0].toLowerCase()}`;
  const ingredients: Ingredient[] = [
    { name: protein.name, amount: protein.grams, unit: 'g', category: protein.category },
    { name: carb.name, amount: carb.name === 'Volkoren wrap' ? 1 : carb.amount, unit: carb.name === 'Volkoren wrap' ? 'stuks' : 'g', category: carb.category },
    ...selectedVegetables.map(([vegetable, amount]) => ({
      name: vegetable, amount, unit: 'g' as const, category: 'Groenten' as const,
    })),
    ...seasoning,
  ];
  const preparationSteps: Record<string, [string, string, string]> = {
    eieren: [
      'Klop de eieren los met peper, zout en paprikapoeder. Snijd de groenten fijn.',
      'Bak de groenten kort in olijfolie. Voeg de eieren toe en roer op laag vuur tot ze net gestold zijn.',
      `Serveer de roereieren met de ${carb.name.toLowerCase()} en werk af met citroensap.`,
    ],
    kwark: [
      'Snijd de groenten klein en kruid met peper, zout en paprikapoeder.',
      'Bak of stoom de groenten gaar. Meng de plattekaas met citroensap, knoflook en kruiden tot een frisse saus.',
      `Serveer de ${carb.name.toLowerCase()} met de groenten en lepel de plattekaassaus erover.`,
    ],
    cottage: [
      'Snijd de groenten klein en kruid met peper, zout en paprikapoeder.',
      'Bak of stoom de groenten gaar. Warm de hüttenkäse kort op een laag vuur op zonder te laten koken.',
      `Serveer met de ${carb.name.toLowerCase()} en verdeel de hüttenkäse erover.`,
    ],
    linzen: [
      'Spoel de linzen af en snijd de groenten in hapklare stukken.',
      'Bak de groenten in olijfolie met knoflook, peper, zout en paprikapoeder. Voeg de linzen toe en warm ze mee.',
      `Serveer de kruidige linzen met de ${carb.name.toLowerCase()} en citroensap.`,
    ],
    tonijn: [
      'Laat de tonijn uitlekken en snijd de groenten in hapklare stukken.',
      'Bak de groenten in olijfolie met knoflook, peper, zout en paprikapoeder. Voeg de tonijn op het einde toe en warm kort mee.',
      `Serveer met de ${carb.name.toLowerCase()} en werk af met citroensap.`,
    ],
  };
  const specificSteps = preparationSteps[protein.key];
  const proteinInstructions = specificSteps ?? [
    `Snijd de ${protein.name.toLowerCase()} en groenten in hapklare stukken. Kruid met peper, zout en paprikapoeder.`,
    protein.key === 'kabeljauw' || protein.key === 'zalm'
      ? `Bak de groenten in olijfolie. Bak de ${protein.name.toLowerCase()} apart in ongeveer 3 à 4 minuten per kant gaar.`
      : `Verhit de olijfolie in een pan en bak de ${protein.name.toLowerCase()} gaar. Bak de groenten de laatste minuten mee.`,
    `Serveer met de ${carb.name.toLowerCase()} en werk af met citroensap.`,
  ];
  return {
    id: `${protein.key}-${carb.type.toLowerCase().replace(/ /g, '-')}-${index + 1}`,
    name,
    description: `Een voedzame, eiwitrijke maaltijd met ${protein.name.toLowerCase()}, ${carb.name.toLowerCase()} en verse groenten. Simpel, betaalbaar en ideaal voor een drukke week.`,
    image: `https://images.unsplash.com/${imageByProtein[protein.key]}?auto=format&fit=crop&w=1200&q=80`,
    time: 20 + ((index * 7 + carbs.indexOf(carb) * 3) % 18),
    difficulty: index % 4 === 0 ? 'Gemiddeld' : 'Makkelijk',
    servings: 1,
    ingredients,
    steps: [
      `Bereid de ${carb.name.toLowerCase()} volgens de aanwijzingen op de verpakking. Giet af indien nodig.`,
      ...proteinInstructions,
    ],
    nutrition: {
      calories: protein.calories + carb.calories + 90 + index % 3 * 12,
      protein: protein.protein + carb.protein + 5,
      carbs: carb.carbs + 14 + index % 4 * 3,
      fat: protein.fat + carb.fat + 7,
    },
    price: Math.round((protein.price + 0.38 + selectedVegetables.length * 0.3 + index % 3 * 0.08) * 100) / 100,
    mealType: 'Hoofdgerecht',
    allergens: [...(protein.allergens ?? []), ...(carb.name === 'Volkoren pasta' || carb.name === 'Couscous' || carb.name === 'Volkoren wrap' ? ['Gluten'] : [])],
    proteinType: protein.type,
    carbType: carb.type,
  };
}

export const recipes: Recipe[] = proteins.flatMap((protein) =>
  carbs.flatMap((carb, carbIndex) =>
    [0, 1].map((variation) => makeRecipe(protein, carb, carbIndex * 2 + variation)),
  ),
);

export const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
