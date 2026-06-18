from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel, Column, String, BigInteger, Text, Numeric, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy import CheckConstraint

if TYPE_CHECKING:
    from backend.models.categoria import Categoria
    from backend.models.ingrediente import Ingrediente


class ProductoCategoria(SQLModel, table=True):
    __tablename__ = "producto_categoria"

    producto_id: int = Field(sa_column=Column(BigInteger, ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True))
    categoria_id: int = Field(sa_column=Column(BigInteger, ForeignKey("categorias.id", ondelete="CASCADE"), primary_key=True))
    es_principal: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, default=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False))


class ProductoIngrediente(SQLModel, table=True):
    __tablename__ = "producto_ingrediente"

    producto_id: int = Field(sa_column=Column(BigInteger, ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True))
    ingrediente_id: int = Field(sa_column=Column(BigInteger, ForeignKey("ingredientes.id", ondelete="CASCADE"), primary_key=True))
    es_removible: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, default=False))
    es_opcional: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, default=False))
    cantidad: float = Field(default=1.0, sa_column=Column(Numeric(10, 3), nullable=False, default=1.0))
    unidad_medida_id: int = Field(sa_column=Column(BigInteger, ForeignKey("unidades_medida.id", ondelete="RESTRICT"), nullable=False))


class Producto(SQLModel, table=True):
    __tablename__ = "productos"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(sa_column=Column(String(150), nullable=False))
    descripcion: Optional[str] = Field(default=None, sa_column=Column(Text))
    precio_base: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    imagenes_url: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    unidad_venta_id: Optional[int] = Field(default=None, foreign_key="unidades_medida.id")
    tiempo_prep_min: Optional[int] = Field(default=None, sa_column=Column(BigInteger))
    stock_cantidad: int = Field(default=0, sa_column=Column(BigInteger, nullable=False, default=0))
    disponible: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, default=True))
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False))
    deleted_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    __table_args__ = (
        CheckConstraint("precio_base >= 0", name="ck_producto_precio_base"),
        CheckConstraint("stock_cantidad >= 0", name="ck_producto_stock_cantidad"),
    )

    categorias: list["Categoria"] = Relationship(
        back_populates="productos", link_model=ProductoCategoria
    )
    ingredientes: list["Ingrediente"] = Relationship(
        back_populates="productos", link_model=ProductoIngrediente
    )
