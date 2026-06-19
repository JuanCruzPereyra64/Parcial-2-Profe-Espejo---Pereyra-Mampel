import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv(".env")

from sqlmodel import select
from passlib.context import CryptContext
from backend.database import create_db_and_tables
from backend.uow.unit_of_work import UnitOfWork
from backend.models.rol import Rol
from backend.models.estado_pedido import EstadoPedido
from backend.models.forma_pago import FormaPago
from backend.models.usuario import Usuario
from backend.models.usuario_rol import UsuarioRol
from backend.models.categoria import Categoria
from backend.models.ingrediente import Ingrediente
from backend.models.producto import Producto, ProductoCategoria, ProductoIngrediente
from backend.models.unidad_medida import UnidadMedida

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Imágenes públicas de Unsplash (pasan por cloudinaryUrl como fallback directo)
# ---------------------------------------------------------------------------
IMGS = {
    "doble_bacon":    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
    "classic_burger": "https://images.unsplash.com/photo-1586816001966-79b736744398?w=600&q=80",
    "bbq_burger":     "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600&q=80",
    "pizza_pepp":     "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    "pizza_marg":     "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
    "pizza_4q":       "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
    "papas_cheddar":  "https://images.unsplash.com/photo-1573080496219-bb964701c98b?w=600&q=80",
    "papas_simple":   "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&q=80",
    "volcan":         "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80",
    "cheesecake":     "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80",
    "coca":           "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80",
    "agua":           "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80",
    "cerveza":        "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&q=80",
    "limonada":       "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=600&q=80",
}


def get_or_create(session, model, filter_field, filter_value, **kwargs):
    obj = session.exec(select(model).where(getattr(model, filter_field) == filter_value)).first()
    if not obj:
        obj = model(**{filter_field: filter_value}, **kwargs)
        session.add(obj)
        session.flush()
    return obj


def run_seed():
    print("=" * 60)
    print("  SEED COMPLETO — Food Store")
    print("=" * 60)
    create_db_and_tables()

    with UnitOfWork() as uow:
        s = uow.session

        # ── Roles ──────────────────────────────────────────────────────────
        print("\n[1/8] Roles...")
        for nombre in ["ADMIN", "STOCK", "PEDIDOS", "CLIENT"]:
            get_or_create(s, Rol, "nombre", nombre, descripcion=f"Rol {nombre}")

        # ── Estados de Pedido ──────────────────────────────────────────────
        print("[2/8] Estados de pedido...")
        estados = [
            ("PENDIENTE",  "Pedido recibido, pago pendiente", 1, False),
            ("CONFIRMADO", "Pago confirmado",                 2, False),
            ("EN_PREP",    "En preparación en cocina",        3, False),
            ("ENTREGADO",  "Entrega confirmada",              4, True),
            ("CANCELADO",  "Pedido cancelado",                5, True),
        ]
        for codigo, desc, orden, terminal in estados:
            ep = s.exec(select(EstadoPedido).where(EstadoPedido.codigo == codigo)).first()
            if not ep:
                s.add(EstadoPedido(codigo=codigo, descripcion=desc, orden=orden, es_terminal=terminal))
            else:
                ep.es_terminal = terminal
                ep.orden = orden

        # ── Formas de Pago ─────────────────────────────────────────────────
        print("[3/8] Formas de pago...")
        for codigo in ["MERCADOPAGO", "EFECTIVO", "TRANSFERENCIA"]:
            get_or_create(s, FormaPago, "codigo", codigo, descripcion=f"Pago mediante {codigo}")

        s.flush()

        # ── Usuarios ───────────────────────────────────────────────────────
        print("[4/8] Usuarios...")
        usuarios_seed = [
            ("admin@foodstore.com",  "Admin",   "Gómez",    "Admin1234!",   "ADMIN"),
            ("test@test.com",        "Cliente", "Prueba",   "Test12345!",   "CLIENT"),
            ("cajero@foodstore.com", "Carlos",  "Cajero",   "Cajero123!",   "PEDIDOS"),
            ("stock@foodstore.com",  "Sofía",   "Stock",    "Stock12345!",  "STOCK"),
        ]
        for email, nombre, apellido, pwd, rol_nombre in usuarios_seed:
            user = uow.usuarios.get_by_email(email)
            if not user:
                user = Usuario(
                    nombre=nombre, apellido=apellido,
                    email=email, password_hash=pwd_context.hash(pwd)
                )
                uow.usuarios.add(user)
                s.flush()
            rol = s.exec(select(Rol).where(Rol.nombre == rol_nombre)).first()
            if rol:
                existe_rel = s.exec(
                    select(UsuarioRol).where(
                        UsuarioRol.usuario_id == user.id,
                        UsuarioRol.rol_id == rol.id
                    )
                ).first()
                if not existe_rel:
                    s.add(UsuarioRol(usuario_id=user.id, rol_id=rol.id))

        s.flush()

        # ── Unidades de Medida ─────────────────────────────────────────────
        print("[5/8] Unidades de medida...")
        unidades_data = [
            ("gramo",     "g",    "peso"),
            ("kilogramo", "kg",   "peso"),
            ("mililitro", "ml",   "volumen"),
            ("litro",     "L",    "volumen"),
            ("unidad",    "ud",   "contable"),
            ("porcion",   "porc", "contable"),
        ]
        U = {}
        for nombre, simbolo, tipo in unidades_data:
            um = s.exec(select(UnidadMedida).where(UnidadMedida.simbolo == simbolo)).first()
            if not um:
                um = UnidadMedida(nombre=nombre, simbolo=simbolo, tipo=tipo)
                s.add(um)
                s.flush()
            U[nombre] = um

        # ── Categorías ─────────────────────────────────────────────────────
        print("[6/8] Categorías y subcategorías...")
        cat_raiz = [
            ("Hamburguesas", "Nuestras clásicas y especiales", "https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&q=80"),
            ("Pizzas",       "A la piedra y masa madre",        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
            ("Bebidas",      "Refrescos, cervezas y más",       "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80"),
            ("Postres",      "Para terminar con algo dulce",    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80"),
            ("Acompañamientos", "Papas, ensaladas y extras",   "https://images.unsplash.com/photo-1573080496219-bb964701c98b?w=400&q=80"),
        ]
        C = {}
        for nombre, desc, img in cat_raiz:
            cat = s.exec(select(Categoria).where(Categoria.nombre == nombre)).first()
            if not cat:
                cat = Categoria(nombre=nombre, descripcion=desc, imagen_url=img)
                s.add(cat)
                s.flush()
            C[nombre] = cat

        # Subcategorías
        subcats = [
            ("Clásicas",         "Hamburguesas clásicas de siempre",   "Hamburguesas"),
            ("Especiales",       "Creaciones del chef",                 "Hamburguesas"),
            ("A la Piedra",      "Pizzas al horno de piedra",           "Pizzas"),
            ("Veganas",          "Opciones plant-based",                "Pizzas"),
            ("Sin Alcohol",      "Gaseosas, aguas y jugos",             "Bebidas"),
            ("Con Alcohol",      "Cervezas y tragos",                   "Bebidas"),
            ("Papas Fritas",     "Papas bastón y wedges",               "Acompañamientos"),
        ]
        for nombre, desc, padre_nombre in subcats:
            cat = s.exec(select(Categoria).where(Categoria.nombre == nombre)).first()
            if not cat:
                padre = C[padre_nombre]
                cat = Categoria(nombre=nombre, descripcion=desc, parent_id=padre.id)
                s.add(cat)
                s.flush()
            C[nombre] = cat

        # ── Ingredientes ───────────────────────────────────────────────────
        print("[7/8] Ingredientes con stock, mínimos y precios de costo...")
        ingredientes_data = [
            # (nombre,               alerg,  unidad,      stock, stock_min, precio_costo)
            ("Pan de Papa",          False,  "unidad",    500,   50,        150.00),
            ("Pan Brioche",          False,  "unidad",    300,   30,        180.00),
            ("Medallón 120g",        False,  "gramo",     400,   100,       10.50),
            ("Medallón Vegano",      False,  "gramo",     150,   50,        12.00),
            ("Queso Cheddar",        True,   "gramo",     600,   150,       14.00),
            ("Queso Muzzarella",     True,   "gramo",     800,   200,       11.00),
            ("Queso Azul",           True,   "gramo",     200,   50,        22.00),
            ("Queso Provolone",      True,   "gramo",     200,   50,        18.00),
            ("Panceta Crocante",     False,  "gramo",     400,   80,        19.00),
            ("Pepperoni",            False,  "gramo",     350,   80,        21.00),
            ("Salsa BBQ",            False,  "mililitro", 500,   100,       7.00),
            ("Salsa de Tomate",      False,  "mililitro", 800,   150,       4.50),
            ("Cebolla Caramelizada", False,  "gramo",     300,   60,        5.00),
            ("Lechuga",              False,  "gramo",     400,   80,        3.50),
            ("Tomate Fresco",        False,  "unidad",    300,   50,        95.00),
            ("Pepino",               False,  "unidad",    200,   30,        80.00),
            ("Masa Madre",           True,   "gramo",     500,   100,       7.50),
            ("Papas Bastón",         False,  "gramo",     1000,  200,       4.00),
            ("Brownie",              True,   "unidad",    100,   20,        550.00),
            ("Helado de Vainilla",   True,   "gramo",     400,   80,        14.00),
            ("Dulce de Leche",       True,   "gramo",     300,   60,        11.00),
            ("Queso Crema",          True,   "gramo",     300,   60,        13.00),
            ("Galletita Orellette",  True,   "gramo",     200,   40,        9.50),
        ]
        I = {}
        for nombre, alergeno, unidad_nombre, stock, stock_min, precio_costo in ingredientes_data:
            ing = s.exec(select(Ingrediente).where(Ingrediente.nombre == nombre)).first()
            if not ing:
                ing = Ingrediente(
                    nombre=nombre,
                    es_alergeno=alergeno,
                    unidad_medida_id=U[unidad_nombre].id,
                    stock_actual=stock,
                    stock_minimo=stock_min,
                    precio_costo=precio_costo,
                )
                s.add(ing)
                s.flush()
            else:
                ing.stock_actual = stock
                ing.stock_minimo = stock_min
                ing.precio_costo = precio_costo
                s.flush()
            I[nombre] = ing

        # ── Productos ──────────────────────────────────────────────────────
        print("[8/8] Productos con imágenes y stock...")

        ud_id  = U["unidad"].id
        g_id   = U["gramo"].id
        ml_id  = U["mililitro"].id

        productos_data = [
            {
                "nombre":      "Doble Queso Bacon",
                "descripcion": "Doble medallón 120g, cuádruple cheddar fundido, panceta crocante y pan de papa artesanal.",
                "precio":      8500,
                "stock":       80,
                "categoria":   "Clásicas",
                "tiempo":      12,
                "imagenes":    [IMGS["doble_bacon"]],
                "ings": [
                    ("Pan de Papa",       1,   ud_id),
                    ("Medallón 120g",   240,    g_id),
                    ("Queso Cheddar",   120,    g_id),
                    ("Panceta Crocante", 80,    g_id),
                ],
            },
            {
                "nombre":      "Classic Burger",
                "descripcion": "Medallón simple, lechuga fresca, tomate y queso cheddar en pan brioche.",
                "precio":      6500,
                "stock":       120,
                "categoria":   "Clásicas",
                "tiempo":      10,
                "imagenes":    [IMGS["classic_burger"]],
                "ings": [
                    ("Pan Brioche",      1,   ud_id),
                    ("Medallón 120g", 120,    g_id),
                    ("Queso Cheddar",  80,    g_id),
                    ("Lechuga",        40,    g_id),
                    ("Tomate Fresco",   1,   ud_id),
                ],
            },
            {
                "nombre":      "BBQ Especial",
                "descripcion": "Medallón jugoso con salsa BBQ ahumada, cebolla caramelizada y pepinillos.",
                "precio":      9200,
                "stock":       60,
                "categoria":   "Especiales",
                "tiempo":      15,
                "imagenes":    [IMGS["bbq_burger"]],
                "ings": [
                    ("Pan Brioche",          1,   ud_id),
                    ("Medallón 120g",      120,    g_id),
                    ("Salsa BBQ",          60,    ml_id),
                    ("Cebolla Caramelizada", 60,   g_id),
                    ("Queso Cheddar",       80,    g_id),
                ],
            },
            {
                "nombre":      "Veggie Burger",
                "descripcion": "Medallón vegano, queso crema, lechuga, tomate y pepino en pan de papa.",
                "precio":      7500,
                "stock":       50,
                "categoria":   "Especiales",
                "tiempo":      12,
                "imagenes":    [IMGS["classic_burger"]],
                "ings": [
                    ("Pan de Papa",      1,   ud_id),
                    ("Medallón Vegano", 120,   g_id),
                    ("Queso Crema",     60,    g_id),
                    ("Lechuga",         40,    g_id),
                    ("Tomate Fresco",    1,   ud_id),
                    ("Pepino",           1,   ud_id),
                ],
            },
            {
                "nombre":      "Pizza Pepperoni",
                "descripcion": "Masa madre, salsa de tomate, muzzarella extra y pepperoni premium.",
                "precio":      12000,
                "stock":       40,
                "categoria":   "A la Piedra",
                "tiempo":      20,
                "imagenes":    [IMGS["pizza_pepp"]],
                "ings": [
                    ("Masa Madre",       250,   g_id),
                    ("Salsa de Tomate", 100,   ml_id),
                    ("Queso Muzzarella", 200,   g_id),
                    ("Pepperoni",        80,    g_id),
                ],
            },
            {
                "nombre":      "Pizza Margarita",
                "descripcion": "La clásica. Masa madre, salsa de tomate casera y muzzarella.",
                "precio":      10000,
                "stock":       50,
                "categoria":   "A la Piedra",
                "tiempo":      18,
                "imagenes":    [IMGS["pizza_marg"]],
                "ings": [
                    ("Masa Madre",       250,   g_id),
                    ("Salsa de Tomate", 100,   ml_id),
                    ("Queso Muzzarella", 200,   g_id),
                ],
            },
            {
                "nombre":      "Pizza 4 Quesos",
                "descripcion": "Muzzarella, cheddar, provolone y azul sobre masa madre.",
                "precio":      13500,
                "stock":       30,
                "categoria":   "A la Piedra",
                "tiempo":      20,
                "imagenes":    [IMGS["pizza_4q"]],
                "ings": [
                    ("Masa Madre",       250,   g_id),
                    ("Salsa de Tomate",  60,   ml_id),
                    ("Queso Muzzarella", 80,    g_id),
                    ("Queso Cheddar",    80,    g_id),
                    ("Queso Provolone",  80,    g_id),
                    ("Queso Azul",       60,    g_id),
                ],
            },
            {
                "nombre":      "Papas con Cheddar y Panceta",
                "descripcion": "Porción generosa de papas bastón bañadas en cheddar fundido y lluvia de panceta.",
                "precio":      4500,
                "stock":       200,
                "categoria":   "Papas Fritas",
                "tiempo":      10,
                "imagenes":    [IMGS["papas_cheddar"]],
                "ings": [
                    ("Papas Bastón",     300,   g_id),
                    ("Queso Cheddar",    80,    g_id),
                    ("Panceta Crocante", 60,    g_id),
                ],
            },
            {
                "nombre":      "Papas Simples",
                "descripcion": "Porción de papas bastón crocantes con sal y ketchup.",
                "precio":      2800,
                "stock":       300,
                "categoria":   "Papas Fritas",
                "tiempo":      8,
                "imagenes":    [IMGS["papas_simple"]],
                "ings": [
                    ("Papas Bastón", 300, g_id),
                ],
            },
            {
                "nombre":      "Volcán de Chocolate",
                "descripcion": "Brownie tibio con centro líquido de chocolate y bocha de helado de vainilla.",
                "precio":      5500,
                "stock":       40,
                "categoria":   "Postres",
                "tiempo":      8,
                "imagenes":    [IMGS["volcan"]],
                "ings": [
                    ("Brownie",           1,  ud_id),
                    ("Helado de Vainilla", 100, g_id),
                ],
            },
            {
                "nombre":      "Cheesecake de Dulce de Leche",
                "descripcion": "Cheesecake cremoso sobre base de galletita con cobertura de dulce de leche.",
                "precio":      4800,
                "stock":       35,
                "categoria":   "Postres",
                "tiempo":      5,
                "imagenes":    [IMGS["cheesecake"]],
                "ings": [
                    ("Queso Crema",       120,  g_id),
                    ("Dulce de Leche",    60,   g_id),
                    ("Galletita Orellette", 60, g_id),
                ],
            },
            {
                "nombre":      "Coca Cola 500ml",
                "descripcion": "Gaseosa Coca Cola bien fría.",
                "precio":      1500,
                "stock":       500,
                "categoria":   "Sin Alcohol",
                "tiempo":      2,
                "imagenes":    [IMGS["coca"]],
                "ings":        [],
            },
            {
                "nombre":      "Agua Mineral 500ml",
                "descripcion": "Agua mineral sin gas.",
                "precio":      900,
                "stock":       500,
                "categoria":   "Sin Alcohol",
                "tiempo":      1,
                "imagenes":    [IMGS["agua"]],
                "ings":        [],
            },
            {
                "nombre":      "Limonada Artesanal",
                "descripcion": "Limonada casera con menta y pepino, muy refrescante.",
                "precio":      2200,
                "stock":       150,
                "categoria":   "Sin Alcohol",
                "tiempo":      3,
                "imagenes":    [IMGS["limonada"]],
                "ings": [
                    ("Pepino", 1, ud_id),
                ],
            },
            {
                "nombre":      "Cerveza Artesanal 500ml",
                "descripcion": "Cerveza rubia artesanal de producción local.",
                "precio":      3500,
                "stock":       200,
                "categoria":   "Con Alcohol",
                "tiempo":      2,
                "imagenes":    [IMGS["cerveza"]],
                "ings":        [],
            },
        ]

        for p_data in productos_data:
            prod = s.exec(select(Producto).where(Producto.nombre == p_data["nombre"])).first()
            if not prod:
                prod = Producto(
                    nombre=p_data["nombre"],
                    descripcion=p_data["descripcion"],
                    precio_base=p_data["precio"],
                    stock_cantidad=p_data["stock"],
                    disponible=True,
                    tiempo_prep_min=p_data["tiempo"],
                    imagenes_url=p_data["imagenes"],
                )
                s.add(prod)
            else:
                prod.imagenes_url = p_data["imagenes"]
                prod.stock_cantidad = p_data["stock"]
            s.flush()

            # Sincronizar categoría — delete + re-insert (categoria_id es parte del PK compuesto)
            cat = C[p_data["categoria"]]
            for vieja in s.exec(select(ProductoCategoria).where(ProductoCategoria.producto_id == prod.id)).all():
                s.delete(vieja)
            s.flush()
            s.add(ProductoCategoria(producto_id=prod.id, categoria_id=cat.id, es_principal=True))
            s.flush()

            # Sincronizar ingredientes — delete + re-insert
            for viejo in s.exec(select(ProductoIngrediente).where(ProductoIngrediente.producto_id == prod.id)).all():
                s.delete(viejo)
            s.flush()
            for ing_nombre, cantidad, um_id in p_data["ings"]:
                s.add(ProductoIngrediente(
                    producto_id=prod.id,
                    ingrediente_id=I[ing_nombre].id,
                    cantidad=cantidad,
                    unidad_medida_id=um_id,
                    es_removible=True,
                    es_opcional=False,
                ))
            s.flush()

        print("\nSeed completo finalizado.")
        print("  Usuarios creados:")
        print("    admin@foodstore.com  / Admin1234!  (ADMIN)")
        print("    test@test.com        / Test12345!  (CLIENT)")
        print("    cajero@foodstore.com / Cajero123!  (PEDIDOS)")
        print("    stock@foodstore.com  / Stock12345! (STOCK)")


if __name__ == "__main__":
    run_seed()
