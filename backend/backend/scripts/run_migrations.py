import sys
from pathlib import Path
from sqlalchemy import text, create_engine
from sqlalchemy.exc import SQLAlchemyError

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import settings

MIGRATIONS_DIR = ROOT / 'migrations'

if not MIGRATIONS_DIR.exists():
    raise SystemExit(f"Migrations directory not found: {MIGRATIONS_DIR}")

engine = create_engine(settings.get_database_url, pool_pre_ping=True)

sql_files = [p for p in sorted(MIGRATIONS_DIR.glob('*.sql')) if p.name != '20260812_create_star_schema.sql']
if not sql_files:
    raise SystemExit(f"No migration files found in: {MIGRATIONS_DIR}")

print("Skipping 20260812_create_star_schema.sql; separate warehouse schema.")

SKIP_MARKERS = (
    'duplicate column name',
    'duplicate key name',
    'already exists',
    'check that column/key exists',
    'can\'t drop column',
    'not found',
    'unknown column',
)

with engine.connect() as conn:
    for sql_file in sql_files:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read().strip()
        if not sql:
            continue
        statements = []
        for raw in sql.split(';'):
            lines = [line for line in raw.splitlines() if not line.strip().startswith('--')]
            stmt = '\n'.join(lines).strip()
            if stmt:
                statements.append(stmt)
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except SQLAlchemyError as exc:
                msg = str(exc).lower()
                if any(marker in msg for marker in SKIP_MARKERS):
                    continue
                raise
    conn.commit()

print(f"Migrations executed successfully: {len(sql_files)} file(s).")
