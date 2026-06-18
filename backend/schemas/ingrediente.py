from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel

from backend.schemas.unidad_medida import UnidadMedidaRead


class IngredienteCreate(SQLModel):
    nombre: str
    unidad_medida_id: int
    es_alergeno: bool = False
    stock_actual: int = 0
    stock_minimo: int = 0
    precio_costo: Optional[Decimal] = None


class IngredienteUpdate(SQLModel):
    nombre: Optional[str] = None
    unidad_medida_id: Optional[int] = None
    es_alergeno: Optional[bool] = None
    stock_actual: Optional[int] = None
    stock_minimo: Optional[int] = None
    precio_costo: Optional[Decimal] = None


class IngredienteRead(SQLModel):
    id: int
    nombre: str
    unidad_medida_id: int
    es_alergeno: bool
    stock_actual: int
    stock_minimo: int
    precio_costo: Optional[Decimal] = None
    unidad_medida: Optional[UnidadMedidaRead] = None
