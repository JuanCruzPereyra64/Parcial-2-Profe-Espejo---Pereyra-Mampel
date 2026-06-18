import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, LayoutDashboard, Search, X } from 'lucide-react'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Pagination } from '../components/common/Pagination'
import { useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria } from '../hooks/useCategorias'
import { usePagination } from '../hooks/usePagination'
import type { Categoria, CategoriaCreate } from '../types'

const PAGE_SIZE = 10
const TIPO_FILTROS = [
  { valor: '', label: 'Todas' },
  { valor: 'raiz', label: 'Principales' },
  { valor: 'sub', label: 'Subcategorías' },
]

type CategoriaNode = Categoria & { children: CategoriaNode[] }
type FlatNode = Categoria & { depth: number; isLast: boolean; ancestorIsLast: boolean[] }

function buildTree(cats: Categoria[]): CategoriaNode[] {
  const map = new Map<number, CategoriaNode>()
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: CategoriaNode[] = []
  cats.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node)
    else roots.push(node)
  })
  return roots
}

function flattenTree(nodes: CategoriaNode[], depth = 0, ancestorIsLast: boolean[] = []): FlatNode[] {
  return nodes.flatMap((node, i) => {
    const isLast = i === nodes.length - 1
    return [
      { ...node, depth, isLast, ancestorIsLast },
      ...flattenTree(node.children, depth + 1, [...ancestorIsLast, isLast]),
    ]
  })
}

function TreeConnector({ depth, isLast, ancestorIsLast }: { depth: number; isLast: boolean; ancestorIsLast: boolean[] }) {
  if (depth === 0) return null
  return (
    <div className="flex shrink-0 self-stretch">
      {ancestorIsLast.map((wasLast, i) => (
        <div
          key={i}
          className={`w-5 shrink-0 ${!wasLast ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''}`}
        />
      ))}
      <div className="w-5 shrink-0 relative">
        <div className="absolute left-[-1px] top-0 bottom-[50%] border-l-2 border-slate-200 dark:border-slate-700" />
        {!isLast && (
          <div className="absolute left-[-1px] top-[50%] bottom-0 border-l-2 border-slate-200 dark:border-slate-700" />
        )}
        <div className="absolute left-0 top-[50%] right-0 border-t-2 border-slate-200 dark:border-slate-700 -translate-y-[1px]" />
      </div>
    </div>
  )
}

export function CategoriasPage() {
  const { data: categorias, isLoading, isError } = useCategorias()
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const isTreeMode = !busqueda.trim() && !filtroTipo

  const treeNodes = useMemo(() => {
    if (!categorias || !isTreeMode) return []
    return flattenTree(buildTree(categorias))
  }, [categorias, isTreeMode])

  const listaFiltrada = useMemo(() => {
    if (!categorias || isTreeMode) return []
    let lista = categorias
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(c => c.nombre.toLowerCase().includes(q) || c.descripcion?.toLowerCase().includes(q))
    }
    if (filtroTipo === 'raiz') lista = lista.filter(c => !c.parent_id)
    if (filtroTipo === 'sub') lista = lista.filter(c => !!c.parent_id)
    return lista
  }, [categorias, busqueda, filtroTipo, isTreeMode])

  const { page, pageItems, totalPages, totalItems, goTo } = usePagination(listaFiltrada, PAGE_SIZE)

  function handleBusqueda(val: string) { setBusqueda(val); goTo(1) }
  function handleFiltroTipo(val: string) { setFiltroTipo(val); goTo(1) }

  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const deleteMutation = useDeleteCategoria()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [form, setForm] = useState<CategoriaCreate & { parent_id?: number | null }>({ nombre: '', descripcion: '', parent_id: null })

  function openCreate() {
    setEditing(null)
    setForm({ nombre: '', descripcion: '', parent_id: null })
    setModalOpen(true)
  }

  function openEdit(cat: Categoria) {
    setEditing(cat)
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion ?? '', parent_id: cat.parent_id })
    setModalOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form }, { onSuccess: () => setModalOpen(false) })
    } else {
      createMutation.mutate(form, { onSuccess: () => setModalOpen(false) })
    }
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-slate-500 font-medium italic">Sintonizando categorías...</p>
    </div>
  )

  if (isError) return (
    <Card className="border-red-100 bg-red-50 dark:bg-red-900/10">
      <p className="text-red-600 dark:text-red-400 font-medium">Ups! Hubo un problema al cargar las categorías.</p>
    </Card>
  )

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Categorías</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestioná las clasificaciones de tus productos gastronómicos.
          </p>
        </div>
        <Button onClick={openCreate} icon={Plus} size="lg">
          Nueva categoría
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          {busqueda && (
            <button onClick={() => handleBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPO_FILTROS.map(f => (
            <button
              key={f.valor}
              onClick={() => handleFiltroTipo(f.valor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroTipo === f.valor
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Table */}
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="premium-table-header w-16">ID</th>
                <th className="premium-table-header">Nombre</th>
                <th className="premium-table-header">Descripción</th>
                <th className="premium-table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isTreeMode
                ? treeNodes.map((node) => (
                    <tr key={node.id} className="premium-table-row">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">#{node.id}</td>
                      <td className="px-3 py-0 h-14">
                        <div className="flex items-stretch h-full gap-1">
                          <TreeConnector depth={node.depth} isLast={node.isLast} ancestorIsLast={node.ancestorIsLast} />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-200">{node.nombre}</span>
                            {node.depth > 0 && (
                              <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1">Sub</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 dark:text-slate-400 italic">
                          {node.descripcion || 'Sin descripción'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(node)} title="Editar" />
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => deleteMutation.mutate(node.id)} title="Eliminar" />
                        </div>
                      </td>
                    </tr>
                  ))
                : pageItems.map((cat) => (
                    <tr key={cat.id} className="premium-table-row">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">#{cat.id}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold text-slate-900 dark:text-slate-200 ${cat.parent_id ? 'ml-4' : ''}`}>
                          {cat.parent_id ? `↳ ${cat.nombre}` : cat.nombre}
                        </span>
                        {cat.parent_id && <span className="ml-2 text-[10px] text-slate-400 border border-slate-200 rounded px-1">Sub</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 dark:text-slate-400 italic">
                          {cat.descripcion || 'Sin descripción'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEdit(cat)} title="Editar" />
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => deleteMutation.mutate(cat.id)} title="Eliminar" />
                        </div>
                      </td>
                    </tr>
                  ))
              }
              {isTreeMode && treeNodes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <LayoutDashboard size={48} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No hay categorías registradas aún.</p>
                      <Button variant="ghost" size="sm" onClick={openCreate}>Crear la primera</Button>
                    </div>
                  </td>
                </tr>
              )}
              {!isTreeMode && listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <LayoutDashboard size={48} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No hay categorías que coincidan con los filtros.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isTreeMode && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-4">
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={goTo} />
          </div>
        )}
      </Card>

      {/* Form Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nombre de la categoría</label>
            <input
              required
              placeholder="Ej: Entradas, Plato Principal..."
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Descripción (opcional)</label>
            <textarea
              placeholder="Breve detalle sobre qué incluye esta categoría..."
              value={form.descripcion ?? ''}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Categoría Padre (opcional)</label>
            <select
              value={form.parent_id || ''}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">Ninguna (Categoría Principal)</option>
              {categorias?.filter(c => c.id !== editing?.id).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-2 pb-4">
            <Button
              type="submit"
              className="w-full py-4 text-base"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
