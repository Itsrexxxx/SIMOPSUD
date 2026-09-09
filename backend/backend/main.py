from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Import ini penting agar SQLAlchemy mengenali semua tabel

from contextlib import asynccontextmanager

def _add_missing_columns() -> None:
    """Tambahkan kolom baru ke tabel yang sudah ada (ALTER TABLE idempotent).

    Berguna untuk SQLite lokal/dev agar field model baru (mis.
    actual_arrival, aircraft_hours_before_departure) muncul tanpa re-seed.
    """
    statements = [
        ("flight_missions", "actual_arrival", "DATETIME"),
        ("flight_missions", "aircraft_hours_before_departure", "FLOAT"),
        ("flight_missions", "payload_kg", "FLOAT"),
        ("flight_missions", "flight_level", "INT"),
        ("flight_missions", "wind_component_kmh", "FLOAT"),
        ("flight_missions", "taxi_time_minutes", "FLOAT"),
        ("flight_missions", "alternate_base_id", "INT"),
        ("flight_missions", "alternate_distance_km", "FLOAT"),
        ("flight_missions", "alternate_fuel_liters", "FLOAT"),
        ("flight_missions", "total_fuel_liters", "FLOAT"),
        ("flight_missions", "sigmet_active", "VARCHAR(20)"),
        ("flight_missions", "taf_summary", "VARCHAR(300)"),
        ("air_bases", "taxi_time_minutes", "FLOAT"),
        ("air_bases", "alternate_minima_ceiling_ft", "INT"),
        ("air_bases", "alternate_minima_vis_m", "INT"),
        ("aircraft_types", "payload_capacity_kg", "FLOAT"),
    ]
    with engine.begin() as conn:
        backend = engine.url.get_backend_name()
        for table, column, col_type in statements:
            try:
                if backend.startswith("sqlite"):
                    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                    cols = {r[1] for r in rows}
                    if column not in cols:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                elif backend.startswith("mysql"):
                    rows = conn.execute(text(
                        f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                        f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}'"
                    )).fetchall()
                    cols = {r[0] for r in rows}
                    if column not in cols:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            except Exception as exc:  # noqa: BLE001
                # Best-effort: jangan gagalkan startup karena kolom sudah ada / hak akses
                print(f"[migrate] skip {table}.{column}: {exc}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Membuat tabel secara otomatis saat startup (Cocok untuk environment dev)
    # Pada level production direkomendasikan menggunakan Alembic migrations
    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
    yield
    # Clean up can be added here if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Konfigurasi CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Mengizinkan semua origin (perlu diperketat di production)
    allow_credentials=True,
    allow_methods=["*"],  # Mengizinkan semua method (GET, POST, dll)
    allow_headers=["*"],  # Mengizinkan semua header
    expose_headers=["X-Total-Count"],
)

# Mendaftarkan seluruh routing API V1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to Aplikasi SIMKO Predictive Engine",
        "docs": "/docs",
        "redoc": "/redoc"
    }
