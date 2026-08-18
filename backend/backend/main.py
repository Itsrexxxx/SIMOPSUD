from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Import ini penting agar SQLAlchemy mengenali semua tabel

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Membuat tabel secara otomatis saat startup (Cocok untuk environment dev)
    # Pada level production direkomendasikan menggunakan Alembic migrations
    Base.metadata.create_all(bind=engine)
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
