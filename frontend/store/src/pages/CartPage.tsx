import { useState } from 'react'
import { toast } from 'sonner'
import { useCartStore } from '../store/useCartStore'
import { pedidosApi, direccionesApi, pagosApi, authApi } from '../services/api'
import type { Direccion } from '../types'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { PaymentStep } from '../components/checkout/PaymentStep'
import { Trash2, ShoppingBag, MapPin, CreditCard } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

const FORMAS_PAGO = [
  { codigo: 'MERCADOPAGO', label: 'MercadoPago' },
  { codigo: 'EFECTIVO', label: 'Efectivo' },
]

export function CartPage() {
  const { items, clearCart, removeItem, updateQuantity, getTotal } = useCartStore()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [addresses, setAddresses] = useState<Direccion[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [formaPago, setFormaPago] = useState('EFECTIVO')
  const [paymentPedido, setPaymentPedido] = useState<{ id: number; total: number } | null>(null)
  const [redirectingToMP, setRedirectingToMP] = useState(false)

  async function openCheckout() {
    setCheckoutOpen(true)
    setPaymentPedido(null)
    setLoadingAddresses(true)
    try {
      const dirs = await direccionesApi.getAll()
      setAddresses(dirs)
      const principal = dirs.find(d => d.es_principal)
      setSelectedAddressId(principal?.id ?? dirs[0]?.id ?? null)
    } catch {
    } finally {
      setLoadingAddresses(false)
    }
  }

  async function handleCheckout() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const pedido = await pedidosApi.create({
        detalles: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
        forma_pago_codigo: formaPago,
        direccion_id: selectedAddressId || undefined,
      })

      if (formaPago === 'MERCADOPAGO') {
        const user = await authApi.me()
        const localBase = `http://localhost:${window.location.port || '5173'}`
        const pref = await pagosApi.crearPreferencia({ pedido_id: pedido.id, email: user.email, frontend_url: localBase })
        setRedirectingToMP(true)
        clearCart()
        window.location.href = pref.sandbox_init_point
        return
      }

      clearCart()
      toast.success('Pedido creado exitosamente')
      navigate('/mis-pedidos')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  function handlePaymentSuccess() {
    clearCart()
    setCheckoutOpen(false)
    setPaymentPedido(null)
    navigate('/mis-pedidos')
  }

  if (items.length === 0 && !redirectingToMP) return (
    <div className="flex flex-col items-center justify-center p-20 text-center">
      <ShoppingBag size={64} className="text-slate-300 mb-6" />
      <h2 className="text-2xl font-bold font-display">Tu carrito está vacío</h2>
      <Button className="mt-6" onClick={() => navigate('/')}>Volver al Catálogo</Button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold font-display">Tu Carrito</h1>

      <Card className="divide-y divide-slate-100">
        {items.map(item => (
          <div key={item.producto_id} className="py-4 px-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                {item.imagen_url ? (
                  <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ShoppingBag size={24} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold">{item.nombre}</h3>
                <p className="text-slate-500">${item.precio} c/u</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                value={item.cantidad}
                onChange={e => updateQuantity(item.producto_id, Number(e.target.value))}
                className="w-16 border border-slate-200 rounded-xl px-2 py-1 text-center"
              />
              <span className="font-bold w-20 text-right">${item.precio * item.cantidad}</span>
              <button onClick={() => removeItem(item.producto_id)} className="text-red-500 hover:text-red-700 p-2">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
        <div className="py-6 flex justify-between items-center">
          <span className="text-xl font-bold">Subtotal:</span>
          <span className="text-2xl font-bold text-primary">${getTotal()}</span>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={openCheckout}>Realizar Pedido</Button>
      </div>

      <Modal open={checkoutOpen} title={paymentPedido ? 'Pagar con MercadoPago' : 'Finalizar pedido'} onClose={() => { setCheckoutOpen(false); setPaymentPedido(null) }}>
        {paymentPedido ? (
          <PaymentStep
            pedidoId={paymentPedido.id}
            total={paymentPedido.total}
            onSuccess={handlePaymentSuccess}
            onBack={() => setPaymentPedido(null)}
          />
        ) : (
          <div className="space-y-6">

            {/* Dirección */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-primary" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Dirección de entrega</h3>
              </div>
              {loadingAddresses ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm text-slate-500 text-center">
                  No tenés direcciones guardadas.{' '}
                  <Link
                    to="/mi-perfil"
                    onClick={() => setCheckoutOpen(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    Agregar en mi perfil
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map(dir => (
                    <label
                      key={dir.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer border-2 transition-colors ${
                        selectedAddressId === dir.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === dir.id}
                        onChange={() => setSelectedAddressId(dir.id)}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        {dir.etiqueta && (
                          <p className="text-xs font-bold text-primary mb-0.5">{dir.etiqueta}</p>
                        )}
                        <p className="text-sm font-medium">{dir.linea1}</p>
                        {dir.linea2 && <p className="text-xs text-slate-400">{dir.linea2}</p>}
                        <p className="text-xs text-slate-400">{dir.ciudad}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Forma de pago */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={18} className="text-primary" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Forma de pago</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FORMAS_PAGO.map(fp => (
                  <label
                    key={fp.codigo}
                    className={`flex items-center gap-2 p-3 rounded-2xl cursor-pointer border-2 transition-colors ${
                      formaPago === fp.codigo
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="formaPago"
                      checked={formaPago === fp.codigo}
                      onChange={() => setFormaPago(fp.codigo)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{fp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">${getTotal()}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-500">Envío</span>
                <span className="font-medium">$500</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-slate-700 pt-3">
                <span>Total</span>
                <span className="text-primary">${getTotal() + 500}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setCheckoutOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleCheckout} isLoading={loading}>
                Confirmar pedido
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
