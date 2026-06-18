import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pedidosApi } from '../services/api'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { Skeleton } from '../components/common/Skeleton'
import { Pagination } from '../components/common/Pagination'
import { usePagination } from '../hooks/usePagination'
import { LayoutDashboard, Search, X } from 'lucide-react'
import { formatCurrency } from '../utils/format'

const PAGE_SIZE = 10

const ESTADOS = [
  { codigo: '', label: 'Todos' },
  { codigo: 'PENDIENTE',  label: 'Pendiente' },
  { codigo: 'CONFIRMADO', label: 'Confirmado' },
  { codigo: 'EN_PREP',    label: 'En Preparación' },
  { codigo: 'ENTREGADO',  label: 'Entregado' },
  { codigo: 'CANCELADO',  label: 'Cancelado' },
]

const estadoBadge: Record<string, { label: string; className: string }> = {
  PENDIENTE:  { label: 'Pendiente',      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  CONFIRMADO: { label: 'Confirmado',     className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  EN_PREP:    { label: 'En Preparación', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ENTREGADO:  { label: 'Entregado',      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  CANCELADO:  { label: 'Cancelado',      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const estadoButtonStyle: Record<string, string> = {
  '':          'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  PENDIENTE:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  CONFIRMADO:  'bg-blue-100 text-blue-700 border border-blue-200',
  EN_PREP:     'bg-amber-100 text-amber-700 border border-amber-200',
  ENTREGADO:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CANCELADO:   'bg-red-100 text-red-700 border border-red-200',
}

export function GestorPedidosPage() {
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busquedaId, setBusquedaId] = useState('')

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: pedidosApi.getAll
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number, estado: string }) => pedidosApi.updateEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Estado del pedido actualizado')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al actualizar pedido')
  })

  const listaFiltrada = useMemo<import('../types').Pedido[]>(() => {
    if (!pedidos) return []

    const prioridades: Record<string, number> = {
      PENDIENTE: 1, CONFIRMADO: 2, EN_PREP: 3, ENTREGADO: 4, CANCELADO: 5
    }

    let lista = [...pedidos].sort((a, b) => {
      const pA = prioridades[a.estado_codigo] ?? 99
      const pB = prioridades[b.estado_codigo] ?? 99
      if (pA !== pB) return pA - pB
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    if (filtroEstado) {
      lista = lista.filter(p => p.estado_codigo === filtroEstado)
    }

    if (busquedaId.trim()) {
      lista = lista.filter(p => String(p.id).includes(busquedaId.trim()))
    }

    return lista
  }, [pedidos, filtroEstado, busquedaId])

  const { page, pageItems, totalPages, totalItems, goTo } = usePagination(listaFiltrada, PAGE_SIZE)

  function handleFiltroEstado(codigo: string) {
    setFiltroEstado(codigo)
    goTo(1)
  }

  function handleBusqueda(val: string) {
    setBusquedaId(val)
    goTo(1)
  }

  if (isLoading) return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-64" />
      <Card noPadding className="overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-display">Gestor de Pedidos</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        {/* Búsqueda por ID */}
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="number"
            min="1"
            placeholder="Buscar por ID..."
            value={busquedaId}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          {busquedaId && (
            <button
              onClick={() => handleBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Botones rápidos por estado */}
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e.codigo}
              onClick={() => handleFiltroEstado(e.codigo)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroEstado === e.codigo
                  ? estadoButtonStyle[e.codigo]
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              <th className="premium-table-header">ID</th>
              <th className="premium-table-header">Fecha</th>
              <th className="premium-table-header">Total</th>
              <th className="premium-table-header">Estado Actual</th>
              <th className="premium-table-header">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.map((p) => (
              <tr key={p.id} className="premium-table-row">
                <td className="px-6 py-4 font-mono text-xs">#{p.id}</td>
                <td className="px-6 py-4">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 font-semibold">{formatCurrency(Number(p.total) || 0)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(estadoBadge[p.estado_codigo] ?? { className: 'bg-slate-100 text-slate-700' }).className}`}>
                    {estadoBadge[p.estado_codigo]?.label ?? p.estado_codigo}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {p.estado_codigo === 'PENDIENTE' && (
                      <>
                        <Button size="sm" className="!bg-green-500 !shadow-green-500/20 hover:!bg-green-600" onClick={() => updateMutation.mutate({ id: p.id, estado: 'CONFIRMADO' })}>Confirmar</Button>
                        <Button size="sm" className="!bg-red-500 !shadow-red-500/20 hover:!bg-red-600" onClick={() => updateMutation.mutate({ id: p.id, estado: 'CANCELADO' })}>Rechazar</Button>
                      </>
                    )}
                    {p.estado_codigo === 'CONFIRMADO' && (
                      <Button size="sm" variant="accent" onClick={() => updateMutation.mutate({ id: p.id, estado: 'EN_PREP' })}>Preparar</Button>
                    )}
                    {p.estado_codigo === 'EN_PREP' && (
                      <Button size="sm" className="!bg-emerald-600 !shadow-emerald-600/20 hover:!bg-emerald-700" onClick={() => updateMutation.mutate({ id: p.id, estado: 'ENTREGADO' })}>Entregado</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {listaFiltrada.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <LayoutDashboard className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500 font-medium">
                    {pedidos?.length === 0 ? 'No hay pedidos registrados.' : 'No hay pedidos que coincidan con los filtros.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-100 dark:border-slate-800 px-4">
          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={goTo} />
        </div>
      </Card>
    </div>
  )
}
