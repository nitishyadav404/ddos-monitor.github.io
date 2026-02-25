"""Alembic async migration environment.
DATABASE_URL is read from .env via app.config — never hardcoded here.
"""
import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Make sure app package is importable when running alembic from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings          # noqa: E402
from app.database import Base                # noqa: E402
import app.models                            # noqa: E402, F401  — registers all ORM models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()

if not settings.DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it to backend/.env before running alembic."
    )

# Inject the real URL at runtime (never in alembic.ini which is committed)
_db_url = (
    settings.DATABASE_URL
    .replace("postgresql://", "postgresql+asyncpg://")
    .replace("postgres://", "postgresql+asyncpg://")
)
config.set_main_option("sqlalchemy.url", _db_url)

target_metadata = Base.metadata


# ── Offline mode (generates SQL script, does not connect) ───────────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connects and runs migrations) ──────────────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = _db_url
    connectable = async_engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
