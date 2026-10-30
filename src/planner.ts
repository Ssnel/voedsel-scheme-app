import { recipes } from './recipes';
import type { PlannedDay, PlannerState, Recipe, Settings, ShoppingItem } from './types';

export const STORAGE_KEY = 'dagroen-planner-v1';
export const DEFAULT_SETTINGS: Settings = {
  proteinGoal: 140,
  calorieGoal: 2200,
  servings: 2,
  budget: 'standard',
  maxTime: 40,
  excluded: [],
};

const brusselsParts = (date: Date): { year: string; month: string; day: string; hour: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour') };
};

export function getActiveMonday(now = new Date()): string {
  const local = brusselsParts(now);
  const today = `${local.year}-${local.month}-${local.day}`;
  const utcDate = new Date(`${today}T00:00:00Z`);
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  const monday = new Date(utcDate);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  if (daysSinceMonday === 0 && Number(local.hour) < 6) monday.setUTCDate(monday.getUTCDate() - 7);
  return monday.toISOString().slice(0, 10);
}

export function getTodayKey(now = new Date()): string {
  const local = brusselsParts(now);
  return `${local.year}-${local.month}-${local.day}`;
}

export function eligibleRecipes(settings: Settings): Recipe[] {
  const excluded = settings.excluded.map((value) => value.toLocaleLowerCase('nl-BE'));
  return recipes.filter((recipe) =>
    recipe.time <= settings.maxTime
    && (settings.budget !== 'budget' || recipe.price <= 3.5)
    && !recipe.ingredients.some((ingredient) => excluded.some((word) => word && ingredient.name.toLocaleLowerCase('nl-BE').includes(word)))
    && !recipe.allergens.some((allergen) => excluded.some((word) => word && allergen.toLocaleLowerCase('nl-BE').includes(word))),
  );
}

export function createPlan(
  weekKey: string,
  settings: Settings,
  history: PlannerState['history'],
  random: () => number = Math.random,
): PlannedDay[] {
  const start = new Date(`${weekKey}T00:00:00Z`);
  const cutoff = new Date(`${getTodayKey()}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const recentlyUsed = new Set(
    history.filter((item) => new Date(`${item.date}T00:00:00Z`) >= cutoff).map((item) => item.recipeId),
  );
  const candidates = eligibleRecipes(settings);
  if (candidates.length < 7) throw new Error('Je filters laten minder dan zeven recepten over. Pas je uitsluitingen of bereidingstijd aan.');
  const available = candidates.filter((recipe) => !recentlyUsed.has(recipe.id));
  if (available.length < 7) throw new Error('Er zijn onvoldoende recepten buiten je recente rotatie. Probeer je weekmenu later opnieuw.');
  const pool = available;
  const plan: PlannedDay[] = [];
  const used = new Set<string>();
  const proteinCounts = new Map<string, number>();
  const carbCounts = new Map<string, number>();

  for (let day = 0; day < 7; day += 1) {
    const ranked = pool.filter((recipe) => !used.has(recipe.id)).map((recipe) => ({
      recipe,
      score: (proteinCounts.get(recipe.proteinType) ?? 0) * 2
        + (carbCounts.get(recipe.carbType) ?? 0) * 1.5
        + Math.abs(recipe.nutrition.protein - settings.proteinGoal * 0.35) / 20
        + Math.abs(recipe.nutrition.calories - settings.calorieGoal * 0.35) / 150
        + random(),
    })).sort((a, b) => a.score - b.score);
    const selected = ranked[0]?.recipe ?? recipes[(day + plan.length) % recipes.length];
    used.add(selected.id);
    proteinCounts.set(selected.proteinType, (proteinCounts.get(selected.proteinType) ?? 0) + 1);
    carbCounts.set(selected.carbType, (carbCounts.get(selected.carbType) ?? 0) + 1);
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + day);
    plan.push({ date: date.toISOString().slice(0, 10), recipeId: selected.id, servings: settings.servings, eaten: false });
  }
  return plan;
}

export function buildShoppingList(plan: PlannedDay[], previous: ShoppingItem[] = []): ShoppingItem[] {
  const totals = new Map<string, ShoppingItem>();
  for (const item of previous.filter(({ manual }) => manual)) {
    totals.set(`${item.name.toLocaleLowerCase('nl-BE')}|${item.unit}`, item);
  }
  for (const day of plan) {
    const recipe = recipes.find(({ id }) => id === day.recipeId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.name.toLocaleLowerCase('nl-BE')}|${ingredient.unit}`;
      const existing = totals.get(key);
      if (existing) existing.amount += ingredient.amount * day.servings / recipe.servings;
      else {
        const old = previous.find((item) => `${item.name.toLocaleLowerCase('nl-BE')}|${item.unit}` === key);
        totals.set(key, {
          ...ingredient,
          amount: ingredient.amount * day.servings / recipe.servings,
          id: old?.id ?? key,
          checked: old?.checked ?? false,
        });
      }
    }
  }
  return [...totals.values()].map((item) => ({ ...item, amount: Math.round(item.amount * 10) / 10 }));
}

export function formatAmount(amount: number, unit: string): string {
  if (unit === 'g' && amount >= 1000) return `${Number((amount / 1000).toFixed(2))} kg`;
  if (unit === 'ml' && amount >= 1000) return `${Number((amount / 1000).toFixed(2))} l`;
  return `${Number(amount.toFixed(1))} ${unit}`;
}

export function loadState(): PlannerState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<PlannerState>;
      if (Array.isArray(parsed.plan) && Array.isArray(parsed.history) && parsed.settings) {
        return {
          planWeek: parsed.planWeek ?? '',
          plan: parsed.plan,
          history: parsed.history.filter((item) => item.date >= getTodayKey(new Date(Date.now() - 90 * 86400000))),
          favorites: parsed.favorites ?? [],
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          shopping: parsed.shopping ?? [],
          hiddenChecked: parsed.hiddenChecked ?? false,
        };
      }
    } catch (error) {
      console.error('De lokaal opgeslagen planner kon niet worden gelezen.', error);
    }
  }
  return {
    planWeek: '',
    plan: [],
    history: [],
    favorites: [],
    settings: DEFAULT_SETTINGS,
    shopping: [],
    hiddenChecked: false,
  };
}

export function recipeForDay(day: PlannedDay): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === day.recipeId);
}
