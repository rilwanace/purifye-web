import { useState, useEffect } from 'react'
import { api } from '../../api'
import RecipeList from './RecipeList'
import RecipeEdit from './RecipeEdit'
import BulkImport from './BulkImport'

export interface Product {
  id: string
  name: string
  unit: string
}

export interface RecipeInput {
  input_sku_id: string
  input_name: string
  unit: string | null
  qty_per_unit: number
}

export interface Recipe {
  output_sku_id: string
  output_name: string
  output_unit: string | null
  inputs: RecipeInput[]
}

export type View = 'list' | 'edit' | 'bulk'

export default function RecipesPage() {
  const [view, setView] = useState<View>('list')
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    api<{ products: Product[] }>('/api/recipes/products')
      .then(d => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [])

  function loadRecipes() {
    return api<{ recipes: Recipe[] }>('/api/recipes/list')
      .then(d => setRecipes(d.recipes || []))
      .catch(() => {})
  }

  useEffect(() => { loadRecipes() }, [])

  function openEdit(recipe: Recipe | null) {
    setEditRecipe(recipe)
    setView('edit')
  }

  function backToList(reload?: boolean) {
    if (reload) loadRecipes()
    setView('list')
    setEditRecipe(null)
  }

  function refreshProducts() {
    api<{ products: Product[] }>('/api/recipes/products')
      .then(d => setProducts(d.products || []))
      .catch(() => {})
  }

  if (view === 'edit') {
    return (
      <RecipeEdit
        recipe={editRecipe}
        products={products}
        onBack={backToList}
        onProductsChanged={refreshProducts}
      />
    )
  }

  if (view === 'bulk') {
    return (
      <BulkImport
        products={products}
        onBack={() => backToList(true)}
        onProductsChanged={refreshProducts}
      />
    )
  }

  return (
    <RecipeList
      recipes={recipes}
      loading={loadingProducts}
      onEdit={openEdit}
      onBulk={() => setView('bulk')}
    />
  )
}
