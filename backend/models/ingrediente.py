from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship, SQLModel, Column, String, BigInteger, Boolean, DateTime
from sqlalchemy import CheckConstraint, Numeric

from backend.models.producto import ProductoIngrediente

if TYPE_CHECKING:
    from backend.models.producto import Producto

from backend.models.unidad_medida import UnidadMedida


class Ingrediente(SQLModel, table=True):
    __tablename__ = "ingredientes"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(sa_column=Column(String(100), unique=True, nullable=False))
    unidad_medida_id: int = Field(foreign_key="unidades_medida.id", nullable=False)

    unidad_medida: Optional["UnidadMedida"] = Relationship(
        back_populates="ingredientes", sa_relationship_kwargs={"lazy": "joined"}
    )
    es_alergeno: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, default=False))

    # DB column stays "stock_cantidad" to preserve existing data; Python attr is stock_actual
    stock_actual: int = Field(
        default=0,
        sa_column=Column("stock_cantidad", BigInteger, nullable=False, default=0),
    )
    stock_minimo: int = Field(
        default=0,
        sa_column=Column("stock_minimo", BigInteger, nullable=False, default=0),
    )
    precio_costo: Optional[Decimal] = Field(
        default=None,
        sa_column=Column("precio_costo", Numeric(10, 2), nullable=True),
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    __table_args__ = (
        CheckConstraint("stock_cantidad >= 0", name="ck_ingrediente_stock_cantidad"),
        CheckConstraint("stock_minimo >= 0", name="ck_ingrediente_stock_minimo"),
    )

    productos: list["Producto"] = Relationship(
        back_populates="ingredientes", link_model=ProductoIngrediente
    )
