import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/useAuthStore'
import { useWsStore } from '../store/useWsStore'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
const WS_URL = `${API_BASE}/ws/mis-pedidos`
const RECONNECT_DELAY = 3000
const PING_INTERVAL = 25000

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP: 'En preparación',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export function useOrderStatusWS() {
  const qc = useQueryClient()
  const token = useAuthStore(s => s.token)
  const setConnected = useWsStore(s => s.setConnected)
  const setLastEvent = useWsStore(s => s.setLastEvent)
  const incrementReconnect = useWsStore(s => s.incrementReconnect)
  const resetReconnect = useWsStore(s => s.resetReconnect)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connect = useCallback(() => {
    if (!token) return

    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      resetReconnect()
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, PING_INTERVAL)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'pong' || data.event === 'ping') return

        setLastEvent(data)

        const label = ESTADO_LABELS[data.estado_nuevo] || data.estado_nuevo
        const anterior = ESTADO_LABELS[data.estado_anterior] || data.estado_anterior

        if (data.event === 'pedido_cancelado') {
          toast.error(`Pedido #${data.pedido_id} cancelado`)
        } else if (data.event === 'pago_confirmado') {
          toast.success(`Pago del pedido #${data.pedido_id} confirmado`)
        } else {
          toast.info(`Pedido #${data.pedido_id}: ${anterior} → ${label}`)
        }

        qc.invalidateQueries({ queryKey: ['mis-pedidos'] })
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      setConnected(false)
      if (pingRef.current) clearInterval(pingRef.current)
      reconnectRef.current = setTimeout(() => {
        incrementReconnect()
        connect()
      }, RECONNECT_DELAY)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [token, qc, setConnected, setLastEvent, incrementReconnect, resetReconnect])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (pingRef.current) clearInterval(pingRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])
}
