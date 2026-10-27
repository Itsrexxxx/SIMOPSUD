"""Isolate tests from the dev database: several suites call Base.metadata.drop_all(engine)."""
import os

os.environ["MYSQL_DB"] = os.environ.get("TEST_MYSQL_DB", "probe_ops_test")

from app.core.config import settings  # noqa: E402

assert not settings.get_database_url.endswith("/probe_ops_db"), "refusing to run tests against the dev database"
