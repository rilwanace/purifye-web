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
}
