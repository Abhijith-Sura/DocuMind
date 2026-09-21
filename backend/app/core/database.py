from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False
connect_args = {}
if "sqlite" in settings.database_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency: yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup and apply lightweight migrations."""
    # Import all models so SQLAlchemy knows about them
    from app.models import User, Document, QueryLog  # noqa: F401
    from sqlalchemy import text

    def _sync_migrate(connection):
        Base.metadata.create_all(connection)
        # Check for missing columns in users table (SQLite safe auto-migration)
        if "sqlite" in settings.database_url:
            result = connection.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_cols = {row[1] for row in result}
            if "avatar_url" not in existing_cols:
                connection.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512)"))
            if "auth_provider" not in existing_cols:
                connection.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'"))
            if "google_id" not in existing_cols:
                connection.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"))

    async with engine.begin() as conn:
        await conn.run_sync(_sync_migrate)
