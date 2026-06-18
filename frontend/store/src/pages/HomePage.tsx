import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { productosApi, categoriasApi, ingredientesApi } from '../services/api'
import { useCartStore } from '../store/useCartStore'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Skeleton } from '../components/common/Skeleton'
import { cloudinaryUrl } from '../utils/cloudinary'
import { ShoppingCart, Search, Leaf } from 'lucide-react'

export function HomePage() {
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<number | null>(null)
  const [ingredienteFilter, setIngredienteFilter] = useState<number | null>(null)
  const { data: productos, isLoading: isLoadingProd } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.getAll() })
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: categoriasApi.getAll })
  const { data: ingredientes } = useQuery({ queryKey: ['ingredientes'], queryFn: ingredientesApi.getAll })
  const addItem = useCartStore(s => s.addItem)

  if (isLoadingProd) return (
    <div className="space-y-8">
      <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-3xl">
        <h1 className="text-4xl font-display font-bold">Catálogo de Productos</h1>
        <p className="text-slate-500 mt-2">Encuentra todo lo que buscas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center justify-between mt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const filtered = productos?.filter(p => {
    if (!p.disponible) return false
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) && !p.descripcion?.toLowerCase().includes(search.toLowerCase())) return false
    if (categoriaFilter && !p.categorias?.some(c => c.id === categoriaFilter)) return false
    if (ingredienteFilter && !p.ingredientes?.some(i => i.id === ingredienteFilter)) return false
    return true
  })

  return (
    <div className="space-y-8">
      <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-3xl">
        <h1 className="text-4xl font-display font-bold">Catálogo de Productos</h1>
        <p className="text-slate-500 mt-2">Encuentra todo lo que buscas</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 text-sm"
          />
        </div>
        <select
          value={categoriaFilter ?? ''}
          onChange={e => setCategoriaFilter(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias?.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <div className="relative">
          <Leaf size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={ingredienteFilter ?? ''}
            onChange={e => setIngredienteFilter(e.target.value ? Number(e.target.value) : null)}
            className="pl-9 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="">Todos los ingredientes</option>
            {ingredientes?.map(i => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered?.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered?.map(p => (
            <Card key={p.id} className="flex flex-col">
              {p.imagenes_url && p.imagenes_url[0] && (
                <img src={cloudinaryUrl(p.imagenes_url[0])} alt={p.nombre} className="h-48 w-full object-cover rounded-xl mb-4" />
              )}
              <h3 className="text-lg font-bold">{p.nombre}</h3>
              <p className="text-sm text-slate-500 flex-1 my-2 line-clamp-2">{p.descripcion}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xl font-bold text-primary">${p.precio_base}</span>
                <Button size="sm" icon={ShoppingCart} onClick={() => {
                  addItem({ id: Date.now(), producto_id: p.id!, cantidad: 1, precio: p.precio_base, nombre: p.nombre, imagen_url: p.imagenes_url?.[0] })
                  toast.success(`${p.nombre} agregado al carrito`)
                }}>
                  Agregar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
