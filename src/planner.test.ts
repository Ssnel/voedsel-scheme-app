import { describe, expect, it } from 'vitest';
import { recipes } from './recipes';
import { buildShoppingList, createPlan, DEFAULT_SETTINGS, eligibleRecipes, getActiveMonday, getTodayKey } from './planner';

describe('week planning and recipe data', () => {
  it('contains 100 distinct recipes', () => {
    expect(recipes).toHaveLength(100);
    expect(new Set(recipes.map(({ id }) => id)).size).toBe(100);
    expect(new Set(recipes.map(({ name }) => name)).size).toBe(100);
    expect(recipes.every((recipe) => recipe.ingredients.length > 0 && recipe.steps.length > 0)).toBe(true);
  });

  it('activates the new week exactly at 06:00 Brussels time on Monday', () => {
    expect(getActiveMonday(new Date('2026-10-26T04:59:00Z'))).toBe('2026-10-19');
    expect(getActiveMonday(new Date('2026-10-26T05:00:00Z'))).toBe('2026-10-26');
    expect(getActiveMonday(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-19');
  });

  it('uses the Brussels calendar date across UTC midnight', () => {
    expect(getTodayKey(new Date('2026-10-29T23:30:00Z'))).toBe('2026-10-30');
  });

  it('creates seven unique dated meals without recently used recipes', () => {
    const history = [{ recipeId: recipes[0].id, date: getTodayKey() }];
    const plan = createPlan('2026-11-02', DEFAULT_SETTINGS, history, () => 0.5);
    expect(plan).toHaveLength(7);
    expect(new Set(plan.map(({ recipeId }) => recipeId)).size).toBe(7);
    expect(plan.map(({ date }) => date)).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ]);
    expect(plan.some(({ recipeId }) => recipeId === recipes[0].id)).toBe(false);
  });

  it('respects allergy, budget and preparation-time filters', () => {
    const filtered = eligibleRecipes({ ...DEFAULT_SETTINGS, excluded: ['gluten', 'vis'], budget: 'budget', maxTime: 25 });
    expect(filtered.length).toBeGreaterThanOrEqual(7);
    expect(filtered.every((recipe) =>
      recipe.time <= 25
      && recipe.price <= 3.5
      && !recipe.allergens.includes('Gluten')
      && !recipe.allergens.includes('Vis'),
    )).toBe(true);
  });

  it('combines quantities and keeps manually added products', () => {
    const plan = [
      { date: '2026-11-02', recipeId: recipes[0].id, servings: 2, eaten: false },
      { date: '2026-11-03', recipeId: recipes[1].id, servings: 2, eaten: false },
    ];
    const manual = { id: 'manual-1', name: 'Koffie', amount: 1, unit: 'stuks' as const, category: 'Overige producten' as const, checked: false, manual: true };
    const shopping = buildShoppingList(plan, [manual]);
    expect(shopping.find(({ name }) => name === 'Olijfolie')?.amount).toBe(20);
    expect(shopping.find(({ name }) => name === 'Koffie')).toMatchObject({ amount: 1, manual: true });
    expect(new Set(shopping.map(({ id }) => id)).size).toBe(shopping.length);
  });
});
