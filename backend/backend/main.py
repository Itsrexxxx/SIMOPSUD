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
        ("flight_missions", "eta_variance_minutes", "FLOAT"),
        ("flight_missions", "delay_reason", "VARCHAR(500)"),
        ("flight_missions", "approved_by", "INT"),
        ("flight_missions", "approved_at", "DATETIME"),
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
        ("flight_missions", "route_points_json", "TEXT"),
        ("flight_missions", "alternate_locations_json", "TEXT"),
        ("flight_missions", "origin_location_json", "TEXT"),
        ("flight_missions", "destination_location_json", "TEXT"),
        ("air_bases", "country", "VARCHAR(100)"),
        ("air_bases", "iata", "VARCHAR(10)"),
        ("air_bases", "location_type", "VARCHAR(40) NOT NULL DEFAULT 'DOMESTIC_AIRBASE'"),
        ("air_bases", "is_active", "BOOLEAN NOT NULL DEFAULT 1"),
        ("air_bases", "taxi_time_minutes", "FLOAT"),
        ("air_bases", "alternate_minima_ceiling_ft", "INT"),
        ("air_bases", "alternate_minima_vis_m", "INT"),
        ("aircraft_types", "payload_capacity_kg", "FLOAT"),
        ("aircraft_units", "squawk_discrepancy", "TEXT"),
        ("aircraft_units", "is_manually_grounded", "BOOLEAN NOT NULL DEFAULT 0"),
        ("users", "nip", "VARCHAR(50)"),
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
    if settings.is_production:
        if settings.SECRET_KEY == "dev-only-change-me" or len(settings.SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY production wajib diisi dan minimal 32 karakter")
        if not settings.SECURE_COOKIES or not settings.cors_origin_list or "*" in settings.cors_origin_list:
            raise RuntimeError("Production wajib memakai Secure cookie dan CORS allowlist")
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
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
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
