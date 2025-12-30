"""Main application entry point for the database server."""

import os

from fastapi import Depends
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.db.models import User, AccessToken

# pylint: disable=unused-import
import app.db.listeners

load_dotenv(".env/api.env")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "db_name")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_URL = os.getenv("DATABASE_URL", "url")


# ---- ASYNC ENGINE (LOGINS, USERS, TOKENS)
async_engine = create_async_engine(
    DB_URL.replace("postgresql+psycopg2", "postgresql+asyncpg"),
    pool_pre_ping=True,
    pool_size=50,
    max_overflow=60,
    pool_timeout=1800,
)
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ---- SYNC ENGINE (COMMON DB OPERATIONS)
sync_engine = create_engine(
    DB_URL, pool_pre_ping=True, pool_size=50, max_overflow=60, pool_timeout=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


def get_db():
    """
    Dependency generator that yields a database session.
    Ensures the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    """
    Dependency generator that yields an asynchronous database session.
    Ensures the session is closed after the request is finished.
    """
    async with AsyncSessionLocal() as session:
        yield session


async def get_user_db(session=Depends(get_async_db)):
    """
    Dependency generator that yields a database session for user operations.
    Ensures the session is closed after the request is finished.
    :param session: Active database session
    :return: SQLAlchemyUserDatabase instance
    """
    yield SQLAlchemyUserDatabase(session, User)


async def get_access_token_db(session=Depends(get_async_db)):
    """
    Dependency generator that yields a database session for access token operations.
    Ensures the session is closed after the request is finished.
    :param session: Active database session
    :return: SQLAlchemyAccessTokenDatabase instance
    """
    yield SQLAlchemyAccessTokenDatabase(session, AccessToken)
