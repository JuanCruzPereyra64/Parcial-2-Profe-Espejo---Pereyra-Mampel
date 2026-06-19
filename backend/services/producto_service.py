from typing import Optional
from fastapi import HTTPException
from sqlmodel import select
from backend.models.producto import Producto, ProductoIngrediente, ProductoCategoria
from backend.schemas.producto import ProductoCreate, ProductoUpdate
from backend.services import categoria_service, ingrediente_service
from backend.uow.unit_of_work import UnitOfWork


def get_all(uow: UnitOfWork, categoria_id: Optional[int] = None, page: int = 1, size: int = 20) -> list[Producto]:
    offset = (page - 1) * size
    return uow.productos.get_all(categoria_id, offset, size)


def count_all(uow: UnitOfWork, categoria_id: Optional[int] = None) -> int:
    return uow.productos.count_all(categoria_id)


def get_by_id(uow: UnitOfWork, producto_id: int) -> Producto:
    producto = uow.productos.get_by_id(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


def create(uow: UnitOfWork, data: ProductoCreate) -> Producto:
    # Validar categorías
    for cat_id in data.categoria_ids:
        categoria_service.get_by_id(uow, cat_id)
    
    # Validar ingredientes
    for ing in data.ingredientes:
        ingrediente_service.get_by_id(uow, ing.id)
        
    producto = Producto.model_validate(data, update={"categorias": [], "ingredientes": []})
    uow.productos.add(producto)
    uow.session.flush()
    uow.session.refresh(producto)
    
    # Unir categorías
    for cat_id in data.categoria_ids:
        link_cat = ProductoCategoria(producto_id=producto.id, categoria_id=cat_id)
        uow.session.add(link_cat)

    # Unir ingredientes
    for ing in data.ingredientes:
        ingrediente = ingrediente_service.get_by_id(uow, ing.id)
        um_id = ing.unidad_medida_id or ingrediente.unidad_medida_id
        uow.session.add(ProductoIngrediente(producto_id=producto.id, ingrediente_id=ing.id, cantidad=ing.cantidad, unidad_medida_id=um_id))
    
    uow.session.flush()
    return get_by_id(uow, producto.id)


def update(uow: UnitOfWork, producto_id: int, data: ProductoUpdate) -> Producto:
    producto = get_by_id(uow, producto_id)
    
    if data.categoria_ids is not None:
        for link in uow.session.exec(select(ProductoCategoria).where(ProductoCategoria.producto_id == producto_id)).all():
            uow.session.delete(link)
        uow.session.flush()
        for cat_id in data.categoria_ids:
            categoria_service.get_by_id(uow, cat_id)
            uow.session.add(ProductoCategoria(producto_id=producto.id, categoria_id=cat_id))

    if data.ingredientes is not None:
        for link in uow.session.exec(select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)).all():
            uow.session.delete(link)
        uow.session.flush()
        for ing in data.ingredientes:
            ingrediente = ingrediente_service.get_by_id(uow, ing.id)
            um_id = ing.unidad_medida_id or ingrediente.unidad_medida_id
            uow.session.add(ProductoIngrediente(producto_id=producto_id, ingrediente_id=ing.id, cantidad=ing.cantidad, unidad_medida_id=um_id))

    for key, value in data.model_dump(exclude_unset=True, exclude={"ingredientes", "categoria_ids"}).items():
        setattr(producto, key, value)
    
    uow.productos.add(producto)
    uow.session.flush()
    return get_by_id(uow, producto_id)


def delete(uow: UnitOfWork, producto_id: int) -> None:
    producto = get_by_id(uow, producto_id)
    uow.productos.delete(producto)
    uow.session.flush()


def add_ingrediente(uow: UnitOfWork, producto_id: int, ingrediente_id: int, cantidad: float = 1.0, unidad_medida_id: int = None) -> ProductoIngrediente:
    producto = get_by_id(uow, producto_id)
    ingrediente_service.get_by_id(uow, ingrediente_id)
    
    existing = uow.session.get(ProductoIngrediente, (producto_id, ingrediente_id))
    if existing:
        raise HTTPException(status_code=400, detail="El ingrediente ya está asociado al producto")
    
    link = ProductoIngrediente(
        producto_id=producto_id,
        ingrediente_id=ingrediente_id,
        cantidad=cantidad,
        unidad_medida_id=unidad_medida_id,
    )
    uow.session.add(link)
    uow.session.flush()
    uow.session.refresh(link)
    return link


def remove_ingrediente(uow: UnitOfWork, producto_id: int, ingrediente_id: int) -> Producto:
    link = uow.session.get(ProductoIngrediente, (producto_id, ingrediente_id))
    if not link:
        raise HTTPException(status_code=404, detail="Ingrediente no presente en el producto")
    uow.session.delete(link)
    uow.session.flush()
    return get_by_id(uow, producto_id)

def update_disponibilidad(uow: UnitOfWork, producto_id: int, disponible: bool) -> Producto:
    producto = get_by_id(uow, producto_id)
    producto.disponible = disponible
    uow.productos.add(producto)
    uow.session.flush()
    uow.session.refresh(producto)
    return producto


def update_stock(uow: UnitOfWork, producto_id: int, stock_cantidad: int) -> Producto:
    producto = get_by_id(uow, producto_id)
    producto.stock_cantidad = stock_cantidad
    uow.productos.add(producto)
    uow.session.flush()
    uow.session.refresh(producto)
    return producto


def update_imagenes(uow: UnitOfWork, producto_id: int, imagenes_url: list[str]) -> Producto:
    producto = get_by_id(uow, producto_id)
    producto.imagenes_url = imagenes_url
    uow.productos.add(producto)
    uow.session.flush()
    uow.session.refresh(producto)
    return producto
