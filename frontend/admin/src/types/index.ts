export interface Categoria {
  id: number
  nombre: string
  descripcion?: string
  parent_id?: number | null
}

export interface DetallePedido {
  id: number
  producto_id: number
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface HistorialEstado {
  id: number
  estado_codigo: string
  created_at: string
  motivo?: string
}

export interface Pedido {
  id: number
  usuario_id: number
  estado_codigo: string
  subtotal: number
  descuento: number
  costo_envio: number
  total: number
  forma_pago_codigo: string
  direccion_id?: number | null
  notas?: string | null
  created_at: string
  updated_at: string
  detalles: DetallePedido[]
  historial: HistorialEstado[]
}

export interface UsuarioLogin {
  email: string
  password: string
}

export interface UnidadMedida {
  id: number
  nombre: string
}

export interface Ingrediente {
  id: number
  nombre: string
  unidad_medida_id: number
  unidad_medida?: UnidadMedida
  es_alergeno: boolean
  stock_actual: number
  stock_minimo: number
  precio_costo?: number | null
}

export interface Producto {
  id: number
  nombre: string
  precio_base: number
  descripcion?: string
  stock_cantidad: number
  disponible: boolean
  imagenes_url: string[]
  categorias: Categoria[]
  ingredientes: Ingrediente[]
}

export interface CategoriaCreate {
  nombre: string
  descripcion?: string
}

export interface IngredienteCreate {
  nombre: string
  unidad_medida_id: number
  es_alergeno: boolean
  stock_actual: number
  stock_minimo: number
  precio_costo?: number | null
}

export interface ProductoIngredienteCreate {
  id: number
  cantidad_requerida: number
}

export interface ProductoCreate {
  nombre: string
  precio_base: number
  descripcion?: string
  categoria_ids: number[]
  ingredientes: ProductoIngredienteCreate[]
  stock_cantidad?: number
  disponible?: boolean
  imagenes_url?: string[]
}

export interface MovimientoStock {
  id: number
  ingrediente_id: number
  cantidad: number
  tipo: string
  motivo: string
  usuario_id?: number
  created_at: string
  ingrediente_nombre?: string
  usuario_nombre?: string
}

export interface ResumenResponse {
  ventas_hoy: number
  ticket_promedio: number
  pedidos_activos: number
  total_mes_actual: number
}

export interface VentasPeriodoItem {
  periodo: string
  total_ventas: number
  cantidad_pedidos: number
}

export interface ProductoTopItem {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  ingresos: number
}

export interface PedidosEstadoItem {
  estado_codigo: string
  cantidad: number
}

export interface IngresosResponse {
  forma_pago_codigo: string
  total: number
  cantidad: number
}
