"""Main application entry point for the database server."""

import os

from fastapi import Depends
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase
from sqlalchemy import create_engine
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

engine = create_engine(
    DB_URL, pool_pre_ping=True, pool_size=50, max_overflow=60, pool_timeout=1800
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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

def get_user_db(session = Depends(get_db)):
    """
    Dependency generator that yields a database session for user operations.
    Ensures the session is closed after the request is finished.
    """
    yield SQLAlchemyUserDatabase(session, User)

def get_access_token_db(session=Depends(get_db)):
    """
    Dependency generator that yields a database session for access token operations.
    Ensures the session is closed after the request is finished.
    """
    yield SQLAlchemyAccessTokenDatabase(session, AccessToken)