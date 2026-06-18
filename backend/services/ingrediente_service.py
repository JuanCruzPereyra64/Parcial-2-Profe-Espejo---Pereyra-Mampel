from decimal import Decimal
from fastapi import HTTPException
from sqlmodel import select
from backend.models.ingrediente import Ingrediente
from backend.models.producto import Producto, ProductoIngrediente
from backend.schemas.ingrediente import IngredienteCreate, IngredienteUpdate
from backend.uow.unit_of_work import UnitOfWork
from backend.services import movimiento_stock_service


def get_all(uow: UnitOfWork, offset: int = 0, limit: int = 100) -> list[Ingrediente]:
    return uow.ingredientes.get_all(offset, limit)


def get_by_id(uow: UnitOfWork, ingrediente_id: int) -> Ingrediente:
    ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
    if not ingrediente:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    return ingrediente


def create(uow: UnitOfWork, data: IngredienteCreate, usuario_id: int = None) -> Ingrediente:
    ingrediente = Ingrediente.model_validate(data)
    uow.ingredientes.add(ingrediente)
    uow.session.flush()

    if ingrediente.stock_actual > 0:
        movimiento_stock_service.registrar_movimiento(
            uow,
            ingrediente_id=ingrediente.id,
            cantidad=float(ingrediente.stock_actual),
            motivo="Stock inicial",
            usuario_id=usuario_id,
        )

    uow.session.refresh(ingrediente)
    return ingrediente


def update(uow: UnitOfWork, ingrediente_id: int, data: IngredienteUpdate, usuario_id: int = None) -> Ingrediente:
    ingrediente = get_by_id(uow, ingrediente_id)

    stock_actual_db = int(ingrediente.stock_actual)
    if data.stock_actual is not None and data.stock_actual != stock_actual_db:
        diferencia = data.stock_actual - stock_actual_db
        movimiento_stock_service.registrar_movimiento(
            uow,
            ingrediente_id=ingrediente.id,
            cantidad=float(diferencia),
            motivo="Ajuste manual",
            usuario_id=usuario_id,
        )

    precio_costo_anterior = ingrediente.precio_costo

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ingrediente, key, value)
    uow.ingredientes.add(ingrediente)
    uow.session.flush()

    nuevo_precio_costo = ingrediente.precio_costo
    if nuevo_precio_costo is not None and nuevo_precio_costo != precio_costo_anterior:
        _actualizar_precios_productos(uow, ingrediente_id, precio_costo_anterior, nuevo_precio_costo)

    uow.session.refresh(ingrediente)
    return ingrediente


def delete(uow: UnitOfWork, ingrediente_id: int) -> None:
    ingrediente = get_by_id(uow, ingrediente_id)
    uow.ingredientes.delete(ingrediente)
    uow.session.flush()


def _actualizar_precios_productos(
    uow: UnitOfWork,
    ingrediente_id: int,
    precio_anterior: Decimal | None,
    precio_nuevo: Decimal,
) -> None:
    """
    Cuando cambia el precio_costo de un ingrediente, recalcula el precio_base
    de todos los productos que lo usan, manteniendo el mismo margen de ganancia.
    """
    links = uow.session.exec(
        select(ProductoIngrediente).where(ProductoIngrediente.ingrediente_id == ingrediente_id)
    ).all()

    if not links:
        return

    producto_ids = {link.producto_id for link in links}

    for producto_id in producto_ids:
        producto = uow.session.get(Producto, producto_id)
        if not producto:
            continue

        # Cargar todos los links del producto
        todos_links = uow.session.exec(
            select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)
        ).all()

        ingrediente_ids = {l.ingrediente_id for l in todos_links}
        ingredientes_map: dict[int, Ingrediente] = {}
        for ing_id in ingrediente_ids:
            ing = uow.session.get(Ingrediente, ing_id)
            if ing:
                ingredientes_map[ing_id] = ing

        # Calcular costo anterior y nuevo
        costo_anterior = Decimal("0")
        costo_nuevo = Decimal("0")
        for link in todos_links:
            ing = ingredientes_map.get(link.ingrediente_id)
            if ing is None:
                continue
            cantidad = Decimal(str(link.cantidad))
            if link.ingrediente_id == ingrediente_id:
                costo_anterior += cantidad * (precio_anterior or Decimal("0"))
                costo_nuevo += cantidad * precio_nuevo
            else:
                costo_viejo = ing.precio_costo or Decimal("0")
                costo_anterior += cantidad * costo_viejo
                costo_nuevo += cantidad * costo_viejo

        if costo_anterior > 0:
            margen = Decimal(str(producto.precio_base)) / costo_anterior
            nuevo_precio = round(costo_nuevo * margen, 2)
            producto.precio_base = nuevo_precio
            uow.session.add(producto)
