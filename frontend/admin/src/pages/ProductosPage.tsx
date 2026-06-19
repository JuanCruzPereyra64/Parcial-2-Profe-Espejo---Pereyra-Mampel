import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, UtensilsCrossed, Filter, Search, ChevronRight, Check, Sparkles } from 'lucide-react'
import { NumberInput } from '../components/common/NumberInput'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Skeleton } from '../components/common/Skeleton'
import { Pagination } from '../components/common/Pagination'
import { useProductos, useCreateProducto, useUpdateProducto, useDeleteProducto } from '../hooks/useProductos'
import { useCategorias } from '../hooks/useCategorias'
import { useIngredientes } from '../hooks/useIngredientes'
import { usePagination } from '../hooks/usePagination'
import type { Producto, ProductoCreate } from '../types'
import { formatCurrency } from '../utils/format'

const PAGE_SIZE = 10

export function ProductosPage() {
  const { data: productos, isLoading, isError } = useProductos()
  const { data: categorias } = useCategorias()
  const { data: todosIngredientes } = useIngredientes()
  const createMutation = useCreateProducto()
  const updateMutation = useUpdateProducto()
  const deleteMutation = useDeleteProducto()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<number | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState<any>({ 
    nombre: '', 
    precio_base: 0, 
    descripcion: '', 
    categoria_id: 0, 
    ingredientes: [] as { id: number; nombre: string; cantidad_requerida: number }[],
    imagenes_url: []
  })
  
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file')
  const [uploadingImage, setUploadingImage] = useState(false)

  const categoriasHoja = useMemo(() => {
    if (!categorias) return []
    const conHijos = new Set(categorias.filter(c => c.parent_id != null).map(c => c.parent_id!))
    return categorias.filter(c => !conHijos.has(c.id))
  }, [categorias])

  const precioSugerido = useMemo(() => {
    if (!todosIngredientes || form.ingredientes.length === 0) return null
    let costo = 0
    let sinPrecio = 0
    for (const fi of form.ingredientes) {
      const ing = todosIngredientes.find(i => i.id === fi.id)
      if (ing?.precio_costo) {
        costo += Number(ing.precio_costo) * Number(fi.cantidad_requerida)
      } else {
        sinPrecio++
      }
    }
    if (costo === 0) return null
    return { precio: Math.round(costo * 1.3 * 100) / 100, sinPrecio }
  }, [form.ingredientes, todosIngredientes])

  const { data: productosFiltrados } = useProductos(filtroCategoria)
  const listaBase = filtroCategoria !== undefined ? productosFiltrados : productos

  const listaFinal = listaBase?.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const { page, pageItems, totalPages, totalItems, goTo } = usePagination(listaFinal, PAGE_SIZE)

  function openCreate() {
    setEditing(null)
    setForm({ 
      nombre: '', 
      precio_base: 0, 
      descripcion: '', 
      categoria_id: categorias?.[0]?.id ?? 0,
      ingredientes: [],
      imagenes_url: []
    })
    setModalOpen(true)
  }

  function openEdit(p: Producto) {
    setEditing(p)
    setForm({ 
      nombre: p.nombre, 
      precio_base: p.precio_base, 
      descripcion: p.descripcion ?? '', 
      categoria_id: p.categorias?.[0]?.id ?? 0,
      ingredientes: p.ingredientes?.map(i => ({ id: i.id, nombre: i.nombre, cantidad_requerida: 1 })) ?? [], // Idealmente p.ingredientes debería traer la cantidad, pero como la relación de SQLModel no lo trae fácil, asumimos 1 al editar por ahora o requeriría cambios profundos en el backend.
      imagenes_url: p.imagenes_url ?? []
    })
    setModalOpen(true)
  }

  function toggleIngrediente(ing: {id: number, nombre: string}) {
    setForm((prev: any) => {
      const exists = prev.ingredientes.find((i: any) => i.id === ing.id)
      if (exists) {
        return { ...prev, ingredientes: prev.ingredientes.filter((i: any) => i.id !== ing.id) }
      }
      return { ...prev, ingredientes: [...prev.ingredientes, { id: ing.id, nombre: ing.nombre, cantidad_requerida: 1 }] }
    })
  }

  function updateCantidad(id: number, cantidad: number) {
    setForm((prev: any) => ({
      ...prev,
      ingredientes: prev.ingredientes.map((i: any) => i.id === id ? { ...i, cantidad_requerida: cantidad } : i)
    }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const { uploadApi } = await import('../services/api')
      const res = await uploadApi.uploadImage(file)
      setForm((prev: any) => ({ ...prev, imagenes_url: [res.url] }))
    } catch (err) {
      alert("Error subiendo imagen")
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (form.ingredientes.length === 0) {
      return
    }

    const payload: ProductoCreate = {
      nombre: form.nombre,
      precio_base: Number(form.precio_base),
      descripcion: form.descripcion,
      categoria_ids: [form.categoria_id],
      ingredientes: form.ingredientes.map((i: any) => ({ id: i.id, cantidad: Number(i.cantidad_requerida) })),
      imagenes_url: form.imagenes_url.filter((u: string) => u.trim() !== '')
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload }, { onSuccess: () => setModalOpen(false) })
    } else {
      createMutation.mutate(payload, { onSuccess: () => setModalOpen(false) })
    }
  }

  if (isLoading) return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-3">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center justify-between mt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  if (isError) return (
    <Card className="border-red-100 bg-red-50 dark:bg-red-900/10">
      <p className="text-red-600 dark:text-red-400 font-medium">Error al cargar la carta de productos.</p>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Productos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestioná tu carta detallada de productos y especialidades.
          </p>
        </div>
        <Button onClick={openCreate} icon={Plus} size="lg">
          Nuevo producto
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <label className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={18} />
          </label>
          <input 
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <label className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter size={18} />
          </label>
          <select
            value={filtroCategoria ?? ''}
            onChange={(e) => setFiltroCategoria(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          >
            <option value="">Todas las categorías</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="premium-table-header w-12 text-center">ID</th>
                <th className="premium-table-header">Producto</th>
                <th className="premium-table-header">Precio</th>
                <th className="premium-table-header">Categoría</th>
                <th className="premium-table-header">Ingredientes</th>
                <th className="premium-table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.map((p) => (
                <tr key={p.id} className="premium-table-row group">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-400 text-center">#{p.id}</td>
                  <td className="px-6 py-4">
                    <Link to={`/productos/${p.id}`} className="flex items-center gap-2 group/link">
                      <span className="font-bold text-slate-900 dark:text-white group-hover/link:text-primary transition-colors">{p.nombre}</span>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-display font-medium text-slate-900 dark:text-slate-200">{formatCurrency(Number(p.precio_base) || 0)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {p.categorias?.[0]?.nombre || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {p.ingredientes?.length ? p.ingredientes.map(i => (
                        <span key={i.id} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded leading-tight">
                          {i.nombre}
                        </span>
                      )) : (
                        <span className="text-slate-400 italic text-xs">Sin ingredientes</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(p)} />
                      <Button variant="danger" size="sm" icon={Trash2} onClick={() => deleteMutation.mutate(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {listaFinal?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <UtensilsCrossed size={48} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron productos.</p>
                      <Button variant="ghost" size="sm" onClick={() => {setSearchTerm(''); setFiltroCategoria(undefined)}}>Limpiar filtros</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 px-4">
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={goTo} />
        </div>
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => setModalOpen(false)} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 flex-1 min-h-0">
          <div className="flex flex-col md:flex-row gap-8 overflow-y-auto pb-6">
            {/* Columna Izquierda */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nombre</label>
                  <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Categoría</label>
                  <select required value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
                    <option value={0} disabled>Seleccionar...</option>
                    {categoriasHoja.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.precio_base}
                  onChange={(e) => setForm({ ...form, precio_base: e.target.value ? Number(e.target.value) : 0 })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {precioSugerido != null && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, precio_base: precioSugerido.precio })}
                      className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                    >
                      <Sparkles size={12} />
                      Precio sugerido: ${precioSugerido.precio.toFixed(2)} (costo + 30%)
                    </button>
                    {precioSugerido.sinPrecio > 0 && (
                      <span className="text-[10px] text-amber-500 ml-4">
                        {precioSugerido.sinPrecio} ingrediente{precioSugerido.sinPrecio > 1 ? 's' : ''} sin precio de costo
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 flex justify-between items-center">
                  Imagen del Producto
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setUploadMode('file')} className={`text-xs px-2 py-1 rounded-md transition-colors ${uploadMode === 'file' ? 'bg-primary text-white font-medium shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Archivo</button>
                    <button type="button" onClick={() => setUploadMode('url')} className={`text-xs px-2 py-1 rounded-md transition-colors ${uploadMode === 'url' ? 'bg-primary text-white font-medium shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>URL</button>
                  </div>
                </label>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {form.imagenes_url[0] && (
                    <div className="shrink-0">
                      <img src={form.imagenes_url[0].startsWith('http') ? form.imagenes_url[0] : `http://localhost:5173${form.imagenes_url[0]}`} alt="Preview" className="w-16 h-16 object-cover rounded-xl shadow-sm border border-slate-200 dark:border-slate-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    {uploadMode === 'file' ? (
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploadingImage} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                        {uploadingImage && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold animate-pulse">Subiendo...</span>}
                      </div>
                    ) : (
                      <input type="text" placeholder="https://ejemplo.com/imagen.png" value={form.imagenes_url[0] || ''} onChange={(e) => setForm({ ...form, imagenes_url: [e.target.value] })}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="flex-1 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 flex items-center justify-between">
                  Ingredientes
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Obligatorio</span>
                </label>
                <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 max-h-[160px] overflow-y-auto">
                  {todosIngredientes?.map(ing => {
                    const isSelected = form.ingredientes.some((i: any) => i.id === ing.id);
                    return (
                      <button
                        type="button"
                        key={ing.id}
                        onClick={() => toggleIngrediente({ id: ing.id, nombre: ing.nombre })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-primary/30'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {ing.nombre}
                      </button>
                    )
                  })}
                  {(!todosIngredientes || todosIngredientes.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No hay ingredientes cargados.</p>
                  )}
                </div>
                
                {form.ingredientes.length > 0 && (
                  <div className="space-y-2 mt-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">Cantidades requeridas por unidad:</p>
                    {form.ingredientes.map((ing: any) => {
                      const ingFull = todosIngredientes?.find(i => i.id === ing.id)
                      const simbolo = ingFull?.unidad_medida?.simbolo || ''
                      return (
                        <div key={ing.id} className="flex items-center justify-between gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1">{ing.nombre}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                            <NumberInput
                              value={ing.cantidad_requerida}
                              onChange={(v) => updateCantidad(ing.id, v)}
                              min={0.01}
                              step={1}
                              allowDecimal
                              required
                            />
                            <span className="text-[10px] text-slate-400 font-medium w-5 shrink-0">{simbolo}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {form.ingredientes.length === 0 && (
                  <p className="text-[10px] text-red-500 font-medium ml-1 italic">* Debés elegir al menos un ingrediente.</p>
                )}
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Descripción</label>
                <textarea value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end">
            <Button type="submit" className="px-8 py-3 text-base" disabled={form.ingredientes.length === 0} isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
