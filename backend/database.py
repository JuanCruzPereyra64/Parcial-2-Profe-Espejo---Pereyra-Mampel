import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine

from backend.core.config import settings

database_url = settings.database_url
if database_url.startswith("sqlite:///./"):
    db_name = database_url.split("sqlite:///./")[1]
    db_path = os.path.join(os.path.dirname(__file__), db_name)
    database_url = f"sqlite:///{db_path}"

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def migrate_db():
    """Adds columns introduced after the initial table creation."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    with engine.connect() as conn:
        ing_cols = {col["name"] for col in inspector.get_columns("ingredientes")}
        if "stock_minimo" not in ing_cols:
            conn.execute(text("ALTER TABLE ingredientes ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0"))
        if "precio_costo" not in ing_cols:
            conn.execute(text("ALTER TABLE ingredientes ADD COLUMN precio_costo NUMERIC(10,2)"))
        conn.commit()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def get_uow():
    from backend.uow.unit_of_work import UnitOfWork
    return UnitOfWork()
