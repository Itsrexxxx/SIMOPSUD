import os
from sqlalchemy import text, create_engine
from app.core.config import settings

SQL_FILE = os.path.join(os.path.dirname(__file__), '..', 'migrations', '20260812_create_star_schema.sql')

if not os.path.exists(SQL_FILE):
    raise SystemExit(f"Migration file not found: {SQL_FILE}")

engine = create_engine(settings.get_database_url, pool_pre_ping=True)

with open(SQL_FILE, 'r', encoding='utf-8') as f:
    sql = f.read()

with engine.connect() as conn:
    # Split statements by semicolon safely for simple SQL
    for stmt in [s.strip() for s in sql.split(';') if s.strip()]:
        conn.execute(text(stmt))
    conn.commit()

print('Migrations executed successfully.')
