from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field
from backend.schemas.categoria import CategoriaRead
from backend.schemas.ingrediente import IngredienteRead

class ProductoIngredienteCreate(SQLModel):
    id: int
    cantidad: float = 1.0
    unidad_medida_id: Optional[int] = None


class AddIngredienteRequest(SQLModel):
    ingrediente_id: int
    cantidad: float = 1.0
    unidad_medida_id: int


class ProductoCreate(SQLModel):
    nombre: str
    precio_base: float
    descripcion: Optional[str] = None
    categoria_ids: list[int] = Field(min_length=1)
    ingredientes: list[ProductoIngredienteCreate] = Field(default=[])
    stock_cantidad: int = 0
    disponible: bool = True
    imagenes_url: list[str] = Field(default=[])
    unidad_venta_id: Optional[int] = None


class ProductoUpdate(SQLModel):
    nombre: Optional[str] = None
    precio_base: Optional[float] = None
    descripcion: Optional[str] = None
    categoria_ids: Optional[list[int]] = None
    ingredientes: Optional[list[ProductoIngredienteCreate]] = None
    stock_cantidad: Optional[int] = None
    disponible: Optional[bool] = None
    imagenes_url: Optional[list[str]] = None
    unidad_venta_id: Optional[int] = None


class ProductoReadBasico(SQLModel):
    id: int
    nombre: str
    precio_base: Decimal
    descripcion: Optional[str] = None
    imagenes_url: list[str] = []


class ProductoIngredienteRead(SQLModel):
    producto_id: int
    ingrediente_id: int
    cantidad: float
    unidad_medida_id: int


class ProductoRead(SQLModel):
    id: int
    nombre: str
    precio_base: Decimal
    descripcion: Optional[str] = None
    stock_cantidad: int
    disponible: bool
    imagenes_url: list[str] = []
    unidad_venta_id: Optional[int] = None
    categorias: list[CategoriaRead] = []
    ingredientes: list[IngredienteRead] = []


class ProductoDisponibilidadUpdate(SQLModel):
    disponible: bool


class ProductoStockUpdate(SQLModel):
    stock_cantidad: int


class ProductoImagenesUpdate(SQLModel):
    imagenes_url: list[str]
