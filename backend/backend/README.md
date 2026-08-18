Backend setup (Probe Ops - SIMKO)

Prerequisites:
- Python 3.10+
- MySQL server accessible
- Create a virtual environment and install requirements: `pip install -r requirements.txt`

Setup steps:
1. Copy `.env.example` to `.env` and edit MySQL credentials (MYSQL_SERVER, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT).
2. Run migrations to create database and star schema:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/run_migrations.py
```

3. Start the app:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Notes:
- The code will auto-create the database (when using MySQL) if it does not exist.
- For production use Alembic for migrations and tighten CORS origins in `main.py`.
