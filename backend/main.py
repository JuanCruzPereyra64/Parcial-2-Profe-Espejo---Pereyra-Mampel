import asyncio
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.core.limiter import limiter
from backend.core.error_handler import validation_handler, rfc_7807_handler
from backend.core.config import settings
from backend.core.ws_manager import ws_manager
from backend.database import create_db_and_tables, migrate_db
from backend.routers import categorias, ingredientes, productos, usuarios, pedidos, direcciones, admin, upload, unidades_medida, stock, pagos, ws, estadisticas

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("foodstore")


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d (%.1f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    ws_manager.set_loop(asyncio.get_running_loop())
    create_db_and_tables()
    migrate_db()
    yield

app = FastAPI(title="Parcial UTN — Sistema de Productos", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(StarletteHTTPException, rfc_7807_handler)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(RequestValidationError, validation_handler)

app.add_middleware(TimingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorias.router)
app.include_router(ingredientes.router)
app.include_router(productos.router)
app.include_router(usuarios.router)
app.include_router(unidades_medida.router)
app.include_router(stock.router)
app.include_router(pedidos.router)
app.include_router(direcciones.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(pagos.router)
app.include_router(ws.router)
app.include_router(estadisticas.router)
