from typing import Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from backend.models.producto import Producto, ProductoCategoria
from backend.models.categoria import Categoria
from backend.repositories.base_repository import BaseRepository

class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: Session):
        super().__init__(Producto, session)

    def _get_categoria_ids(self, categoria_id: int) -> list[int]:
        ids = [categoria_id]
        hijos = self.session.exec(
            select(Categoria.id).where(Categoria.parent_id == categoria_id)
        ).all()
        for hijo_id in hijos:
            ids.extend(self._get_categoria_ids(hijo_id))
        return ids

    def get_all(self, categoria_id: Optional[int] = None, offset: int = 0, limit: int = 100) -> list[Producto]:
        statement = (
            select(Producto)
            .options(selectinload(Producto.ingredientes), selectinload(Producto.categorias))
        )

        if categoria_id:
            ids = self._get_categoria_ids(categoria_id)
            statement = statement.join(ProductoCategoria).where(ProductoCategoria.categoria_id.in_(ids))

        statement = statement.offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def count_all(self, categoria_id: Optional[int] = None) -> int:
        from sqlalchemy import func
        query = select(func.count(Producto.id))
        if categoria_id:
            ids = self._get_categoria_ids(categoria_id)
            query = query.join(ProductoCategoria).where(ProductoCategoria.categoria_id.in_(ids))
        return self.session.exec(query).one()

    def get_by_id(self, producto_id: int) -> Optional[Producto]:
        statement = (
            select(Producto)
            .where(Producto.id == producto_id)
            .options(selectinload(Producto.ingredientes), selectinload(Producto.categorias))
        )
        return self.session.exec(statement).first()
