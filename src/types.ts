export type FoodCategory =
  | 'Vlees & gevogelte'
  | 'Vis'
  | 'Groenten'
  | 'Fruit'
  | 'Zuivel'
  | 'Droge voeding'
  | 'Kruiden & sauzen'
  | 'Overige producten';

export interface Ingredient {
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'stuks';
  category: FoodCategory;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  image: string;
  time: number;
  difficulty: 'Makkelijk' | 'Gemiddeld';
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  price: number;
  mealType: string;
  allergens: string[];
  proteinType: string;
  carbType: string;
}

export interface Settings {
  proteinGoal: number;
  calorieGoal: number;
  servings: number;
  budget: 'budget' | 'standard';
  maxTime: number;
  excluded: string[];
}

export interface PlannedDay {
  date: string;
  recipeId: string;
  servings: number;
  eaten: boolean;
}

export interface ShoppingItem extends Ingredient {
  id: string;
  checked: boolean;
  manual?: boolean;
}

export interface PlannerState {
  planWeek: string;
  plan: PlannedDay[];
  history: { recipeId: string; date: string }[];
  favorites: string[];
  settings: Settings;
  shopping: ShoppingItem[];
  hiddenChecked: boolean;
}
