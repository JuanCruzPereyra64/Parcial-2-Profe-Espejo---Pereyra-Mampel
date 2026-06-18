import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pedidosApi } from '../services/api'
import { Card } from '../components/common/Card'
import { Skeleton } from '../components/common/Skeleton'
import { Pagination } from '../components/common/Pagination'
import { usePagination } from '../hooks/usePagination'
import { TrendingUp, DollarSign, Clock, LayoutDashboard, Filter, Search, X } from 'lucide-react'
import { formatCurrency } from '../utils/format'

const PAGE_SIZE = 10

export function VentasPage() {
  const { data: pedidos, isLoading, isError } = useQuery({
    queryKey: ['pedidos'],
    queryFn: pedidosApi.getAll
  })

  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [busquedaId, setBusquedaId] = useState('')

  // Cálculos de métricas
  const metricas = useMemo(() => {
    if (!pedidos) return { ingresosLiquidos: 0, aLiquidar: 0, cantidadVentas: 0, ticketPromedio: 0 }

    let liquidos = 0
    let aLiquidar = 0
    let cantEntregados = 0

    pedidos.forEach(p => {
      const totalNum = Number(p.total) || 0
      if (p.estado_codigo === 'ENTREGADO') {
        liquidos += totalNum
        cantEntregados++
      } else if (['EN_PREP', 'CONFIRMADO'].includes(p.estado_codigo)) {
        aLiquidar += totalNum
      }
    })

    const ticketPromedio = cantEntregados > 0 ? liquidos / cantEntregados : 0

    return { ingresosLiquidos: liquidos, aLiquidar, cantidadVentas: cantEntregados, ticketPromedio }
  }, [pedidos])

  const listaFiltrada: import('../types').Pedido[] = useMemo(() => {
    if (!pedidos) return []
    let list = pedidos
    if (filtroEstado === 'A_LIQUIDAR') {
      list = pedidos.filter(p => ['EN_PREP', 'CONFIRMADO'].includes(p.estado_codigo))
    } else if (filtroEstado) {
      list = pedidos.filter(p => p.estado_codigo === filtroEstado)
    } else {
      list = pedidos.filter(p => ['ENTREGADO', 'EN_PREP', 'CONFIRMADO'].includes(p.estado_codigo))
    }
    if (busquedaId.trim()) {
      list = list.filter(p => String(p.id).includes(busquedaId.trim()))
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [pedidos, filtroEstado, busquedaId])

  const { page, pageItems, totalPages, totalItems, goTo } = usePagination(listaFiltrada, PAGE_SIZE)

  const estadoBadge: Record<string, { label: string; className: string }> = {
    PENDIENTE:  { label: 'Pendiente',       className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    CONFIRMADO: { label: 'Confirmado',      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    EN_PREP:    { label: 'En Preparación',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    ENTREGADO:  { label: 'Entregado',       className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    CANCELADO:  { label: 'Cancelado',       className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }

  if (isLoading) return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6"><Skeleton className="h-24 w-full" /></Card>
        ))}
      </div>
      <Card noPadding className="overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  if (isError) return (
    <Card className="border-red-100 bg-red-50 dark:bg-red-900/10">
      <p className="text-red-600 dark:text-red-400 font-medium">Error al cargar las métricas de ventas.</p>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Ingresos y Ventas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor de finanzas y ventas en tiempo real.
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 font-medium text-sm">Ingresos Líquidos (Cobrado)</p>
              <h3 className="text-3xl font-bold mt-2 font-display">{formatCurrency(metricas.ingresosLiquidos)}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <DollarSign size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-100 font-medium text-sm">A Liquidar (En Preparación)</p>
              <h3 className="text-3xl font-bold mt-2 font-display">{formatCurrency(metricas.aLiquidar)}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Clock size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Ticket Promedio</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white font-display">{formatCurrency(metricas.ticketPromedio)}</h3>
              <p className="text-xs text-slate-400 mt-1">En base a {metricas.cantidadVentas} ventas cobradas.</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp size={24} className="text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Búsqueda por ID */}
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="number"
              min="1"
              placeholder="Buscar por ID de pedido..."
              value={busquedaId}
              onChange={(e) => { setBusquedaId(e.target.value); goTo(1) }}
              className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
            {busquedaId && (
              <button onClick={() => { setBusquedaId(''); goTo(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          {/* Filtro por estado/tipo */}
          <div className="relative min-w-[220px]">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); goTo(1) }}
              className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            >
              <option value="">Ingresos (Entregados y en Preparación)</option>
              <option value="ENTREGADO">Entregados (Cobrados)</option>
              <option value="A_LIQUIDAR">A Liquidar (En Preparación)</option>
            </select>
          </div>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                <th className="premium-table-header">Pedido</th>
                <th className="premium-table-header">Fecha</th>
                <th className="premium-table-header">Estado</th>
                <th className="premium-table-header text-right">Subtotal</th>
                <th className="premium-table-header text-right">Costo Envío</th>
                <th className="premium-table-header text-right">Total Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageItems.map((p) => (
                <tr key={p.id} className="premium-table-row">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">#{p.id}</td>
                  <td className="px-6 py-4">{new Date(p.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${(estadoBadge[p.estado_codigo] ?? { className: 'bg-slate-100 text-slate-700' }).className}`}>
                      {estadoBadge[p.estado_codigo]?.label ?? p.estado_codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(Number(p.subtotal) || 0)}</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(Number(p.costo_envio) || 0)}</td>
                  <td className="px-6 py-4 text-right font-display font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(p.total) || 0)}</td>
                </tr>
              ))}
              {listaFiltrada.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <LayoutDashboard size={48} className="text-slate-200 dark:text-slate-700" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No hay registros para mostrar.</p>
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
