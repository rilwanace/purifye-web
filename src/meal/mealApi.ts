import { api } from '../api'

const BASE = '/api/meal'

export interface Recipe {
  id: string
  name: string
  description: string
  meal_slots: string[]
  protein_type: string
  cuisine: string
  effort_level: number
  prep_time_min: number
  cook_time_min: number
  equipment_required: string[]
  kid_friendly: boolean
  image_url: string | null
  is_premium_ingredient: boolean
  availability_tier: string
  batch_prep_friendly?: boolean
  source?: string
  base_servings?: number
}

export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[]
  steps: Step[]
  dessert_formula: { base: string; elevators: string[] } | null
  batch_prep_friendly: boolean
  batch_prep_notes: string | null
  source: string
  base_servings: number
}

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
  is_premade_available: boolean
  premade_note: string | null
  is_optional: boolean
}

export interface Step {
  id: string
  step_number: number
  instruction: string
  is_prep_step: boolean
  time_minutes: number
}

export interface Preferences {
  family_adults: number
  family_kids: number
  equipment_available: string[]
  excluded_proteins: string[]
  premium_ingredients: boolean
  preferred_cuisines: string[]
  plan_days: number
  include_dessert: boolean
}

export interface RecipeFilters {
  protein_type?: string
  cuisine?: string
  meal_slot?: string
  search?: string
}

export interface PlanSlot {
  id: string
  day_number: number
  meal_slot: string
  is_locked: boolean
  is_swapped: boolean
  recipe_id: string
  recipe_name: string
  description: string
  protein_type: string
  effort_level: number
  prep_time_min: number
  cook_time_min: number
  batch_prep_friendly: boolean
  kid_friendly: boolean
}

export interface PlanDay {
  day: number
  slots: PlanSlot[]
  batch_prep_notes: string[]
}

export interface MealPlan {
  id: string
  week_start_date: string
  plan_days: number
  family_adults: number
  family_kids: number
  effective_servings: number
  status: 'draft' | 'confirmed' | 'completed'
  days: PlanDay[]
}

export interface GroceryItem {
  id: string
  ingredient_name: string
  total_quantity: number
  unit: string
  category: string
  is_premade: boolean
  premade_note: string | null
  is_optional: boolean
  is_checked: boolean
  display_order: number
}

export interface GroceryList {
  grocery_list_id: string
  plan_id: string
  categories: Record<string, GroceryItem[]>
}

export const meal = {
  recipes: (params?: RecipeFilters) => {
    const q = new URLSearchParams()
    if (params?.protein_type) q.set('protein_type', params.protein_type)
    if (params?.cuisine) q.set('cuisine', params.cuisine)
    if (params?.meal_slot) q.set('meal_slot', params.meal_slot)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return api<Recipe[]>(`${BASE}/recipes${qs ? '?' + qs : ''}`)
  },

  recipeDetail: (id: string) =>
    api<RecipeDetail>(`${BASE}/recipes/${encodeURIComponent(id)}`),

  preferences: async (): Promise<Preferences | null> => {
    try {
      const result = await api<Preferences | null>(`${BASE}/preferences`)
      return result ?? null
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('404') || msg.includes('not found') || msg.includes('no preference')) return null
      throw e
    }
  },

  updatePreferences: (data: Preferences) =>
    api<Preferences>(`${BASE}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  generatePlan: () =>
    api<MealPlan>(`${BASE}/plans/generate`, { method: 'POST' }),

  fetchCurrentPlan: async (): Promise<MealPlan | null> => {
    try {
      return await api<MealPlan>(`${BASE}/plans/current`)
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      if (msg.includes('404') || msg.includes('no plan')) return null
      throw e
    }
  },

  confirmPlan: (planId: string) =>
    api<MealPlan>(`${BASE}/plans/${encodeURIComponent(planId)}/confirm`, { method: 'PUT' }),

  swapSlot: (planId: string, slotId: string, newRecipeId: string) =>
    api<MealPlan>(
      `${BASE}/plans/${encodeURIComponent(planId)}/slots/${encodeURIComponent(slotId)}/swap`,
      { method: 'PUT', body: JSON.stringify({ new_recipe_id: newRecipeId }) },
    ),

  lockSlot: (planId: string, slotId: string) =>
    api<MealPlan>(
      `${BASE}/plans/${encodeURIComponent(planId)}/slots/${encodeURIComponent(slotId)}/lock`,
      { method: 'PUT' },
    ),

  regeneratePlan: (planId: string) =>
    api<MealPlan>(`${BASE}/plans/${encodeURIComponent(planId)}/regenerate`, { method: 'POST' }),

  fetchGroceryList: (planId: string) =>
    api<GroceryList>(`${BASE}/plans/${encodeURIComponent(planId)}/grocery`),

  toggleGroceryItem: (itemId: string) =>
    api<{ id: string; is_checked: boolean }>(
      `${BASE}/grocery/${encodeURIComponent(itemId)}/check`,
      { method: 'PUT' },
    ),
}
