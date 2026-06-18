import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, UtensilsCrossed, Filter, Search, ChevronRight, Check } from 'lucide-react'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { useProductos, useCreateProducto, useUpdateProducto, useDeleteProducto } from '../hooks/useProductos'
import { useCategorias } from '../hooks/useCategorias'
import { useIngredientes } from '../hooks/useIngredientes'
import type { Producto, ProductoCreate } from '../types'

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
    ingrediente_ids: [] 
  })

  const categoriasHoja = useMemo(() => {
    if (!categorias) return []
    const conHijos = new Set(categorias.filter(c => c.parent_id != null).map(c => c.parent_id!))
    return categorias.filter(c => !conHijos.has(c.id))
  }, [categorias])

  const { data: productosFiltrados } = useProductos(filtroCategoria)
  const listaBase = filtroCategoria !== undefined ? productosFiltrados : productos
  
  const listaFinal = listaBase?.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function openCreate() {
    setEditing(null)
    setForm({ 
      nombre: '', 
      precio_base: 0, 
      descripcion: '', 
      categoria_id: categorias?.[0]?.id ?? 0,
      ingrediente_ids: [] 
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
      ingrediente_ids: p.ingredientes?.map(i => i.id) ?? []
    })
    setModalOpen(true)
  }

  function toggleIngrediente(id: number) {
    setForm(prev => {
      const ids = prev.ingrediente_ids.includes(id)
        ? prev.ingrediente_ids.filter(i => i !== id)
        : [...prev.ingrediente_ids, id]
      return { ...prev, ingrediente_ids: ids }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validar ingredientes obligatorios
    if (form.ingrediente_ids.length === 0) {
      alert("Por favor, seleccioná al menos un ingrediente para este producto.")
      return
    }

    const payload: ProductoCreate = {
      nombre: form.nombre,
      precio_base: form.precio_base,
      descripcion: form.descripcion,
      categoria_ids: [form.categoria_id],
      ingrediente_ids: form.ingrediente_ids
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload }, { onSuccess: () => setModalOpen(false) })
    } else {
      createMutation.mutate(payload, { onSuccess: () => setModalOpen(false) })
    }
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-slate-500 font-medium italic">Preparando el menú...</p>
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
              {listaFinal?.map((p) => (
                <tr key={p.id} className="premium-table-row group">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-400 text-center">#{p.id}</td>
                  <td className="px-6 py-4">
                    <Link to={`/productos/${p.id}`} className="flex items-center gap-2 group/link">
                      <span className="font-bold text-slate-900 dark:text-white group-hover/link:text-primary transition-colors">{p.nombre}</span>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-display font-medium text-slate-900 dark:text-slate-200">${p.precio_base.toFixed(2)}</span>
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
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <input required type="number" min="0.01" step="0.01" value={form.precio_base}
              onChange={(e) => setForm({ ...form, precio_base: Number(e.target.value) })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 flex items-center justify-between">
              Ingredientes
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Obligatorio</span>
            </label>
            <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 max-h-[160px] overflow-y-auto">
              {todosIngredientes?.map(ing => (
                <button
                  type="button"
                  key={ing.id}
                  onClick={() => toggleIngrediente(ing.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    form.ingrediente_ids.includes(ing.id)
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:border-primary/30'
                  }`}
                >
                  {form.ingrediente_ids.includes(ing.id) && <Check size={12} />}
                  {ing.nombre}
                </button>
              ))}
              {(!todosIngredientes || todosIngredientes.length === 0) && (
                <p className="text-xs text-slate-400 italic">No hay ingredientes cargados.</p>
              )}
            </div>
            {form.ingrediente_ids.length === 0 && (
              <p className="text-[10px] text-red-500 font-medium ml-1 italic">* Debés elegir al menos un ingrediente.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Descripción</label>
            <textarea value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px]" />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full py-4 text-base" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
