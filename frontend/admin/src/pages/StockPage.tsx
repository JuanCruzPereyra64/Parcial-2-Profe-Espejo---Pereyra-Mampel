import { useState, useMemo } from 'react'
import { Card } from '../components/common/Card'
import { Pagination } from '../components/common/Pagination'
import { useMovimientosStock } from '../hooks/useStock'
import { useIngredientes } from '../hooks/useIngredientes'
import { usePagination } from '../hooks/usePagination'
import { Package, ArrowDownRight, ArrowUpRight, Filter, Search, X } from 'lucide-react'

const PAGE_SIZE = 15
const TIPO_MOVIMIENTO = [
  { valor: '', label: 'Todos' },
  { valor: 'INGRESO', label: 'Ingresos' },
  { valor: 'EGRESO', label: 'Egresos' },
]

export function StockPage() {
  const [filtroIngrediente, setFiltroIngrediente] = useState<number | undefined>()
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const { data: movimientos, isLoading, isError } = useMovimientosStock(filtroIngrediente)
  const { data: ingredientes } = useIngredientes()

  const listaFiltrada = useMemo(() => {
    if (!movimientos) return []
    let lista = movimientos
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(m => m.motivo?.toLowerCase().includes(q))
    }
    if (filtroTipo) lista = lista.filter(m => m.tipo === filtroTipo)
    return lista
  }, [movimientos, busqueda, filtroTipo])

  const { page, pageItems, totalPages, totalItems, goTo } = usePagination(listaFiltrada, PAGE_SIZE)

  function handleBusqueda(val: string) { setBusqueda(val); goTo(1) }
  function handleFiltroTipo(val: string) { setFiltroTipo(val); goTo(1) }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-slate-500 font-medium italic">Revisando los libros de stock...</p>
    </div>
  )

  if (isError) return (
    <Card className="border-red-100 bg-red-50 dark:bg-red-900/10">
      <p className="text-red-600 dark:text-red-400 font-medium">Error al cargar el historial de stock.</p>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Movimientos de Stock</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Auditoria completa de ingresos y egresos de ingredientes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Filtro por ingrediente */}
          <div className="relative min-w-[220px]">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={filtroIngrediente ?? ''}
              onChange={(e) => { setFiltroIngrediente(e.target.value ? Number(e.target.value) : undefined); goTo(1) }}
              className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            >
              <option value="">Todos los ingredientes</option>
              {ingredientes?.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.nombre}</option>
              ))}
            </select>
          </div>
          {/* Búsqueda por motivo */}
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por motivo..."
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
        </div>
        {/* Botones rápidos tipo */}
        <div className="flex flex-wrap gap-2">
          {TIPO_MOVIMIENTO.map(f => (
            <button
              key={f.valor}
              onClick={() => handleFiltroTipo(f.valor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroTipo === f.valor
                  ? f.valor === 'INGRESO'
                    ? 'bg-green-500 text-white'
                    : f.valor === 'EGRESO'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="premium-table-header w-32">Fecha y Hora</th>
                <th className="premium-table-header">Ingrediente</th>
                <th className="premium-table-header text-center">Tipo</th>
                <th className="premium-table-header text-right">Cantidad</th>
                <th className="premium-table-header">Motivo</th>
                <th className="premium-table-header">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.map((mov) => (
                <tr key={mov.id} className="premium-table-row">
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(mov.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{mov.ingrediente_nombre}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {mov.tipo === 'INGRESO' ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                        <ArrowUpRight size={12} />
                        Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                        <ArrowDownRight size={12} />
                        Egreso
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono font-bold ${mov.tipo === 'INGRESO' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}{mov.cantidad}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 dark:text-slate-400">{mov.motivo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-500 text-xs">{mov.usuario_nombre || 'Sistema'}</span>
                  </td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={48} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {movimientos?.length === 0 ? 'No hay movimientos registrados.' : 'No hay movimientos que coincidan con los filtros.'}
                      </p>
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
    </div>
  )
}
