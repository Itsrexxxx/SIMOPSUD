from typing import Generator
import re
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings


def _ensure_mysql_database(db_url: str) -> None:
    """If using MySQL, connect to the server and create the database if it doesn't exist.
    This prevents errors when `create_all` runs but the database itself hasn't been created.
    """
    # Only handle mysql+pymysql URLs here
    if not db_url.startswith("mysql"):
        return

    # Extract server URL (without database) and database name
    m = re.match(r"(?P<prefix>mysql\+pymysql://[^/]+)(?:/(?P<db>[^?]+))?", db_url)
    if not m:
        return

    db_name = m.group("db")
    if not db_name:
        return

    server_url = m.group("prefix") + "/"

    tmp_engine = create_engine(server_url, pool_pre_ping=True)
    try:
        with tmp_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            conn.commit()
    finally:
        tmp_engine.dispose()


# Ensure DB exists before creating the main engine
_ensure_mysql_database(settings.get_database_url)

engine = create_engine(
    settings.get_database_url,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """Dependency function that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
