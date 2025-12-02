#!/bin/sh

echo "Waiting for PostgreSQL ($DB_HOST)..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready!"

export PYTHONPATH=/code
export ALEMBIC_CONFIG=/code/alembic.ini

echo "Attempting to create a new Alembic revision based on current models..."
cd /code
alembic revision --autogenerate -m "Auto init on start"

echo "Applying database migrations..."
alembic upgrade head

echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000