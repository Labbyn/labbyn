#!/bin/sh

echo "Waiting for PostgreSQL ($DB_HOST)..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready!"

ENV_FILE="/code/api.env"
echo "Generating AUTH_SECRET if not present in $ENV_FILE..."
if [ -f "$ENV_FILE" ]; then
    if ! grep -q "^AUTH_SECRET=" "$ENV_FILE" || [ -z "$(grep "^AUTH_SECRET=" "$ENV_FILE" | cut -d'=' -f2)" ]; then
        echo "AUTH_SECRET not found in $ENV_FILE. Generating..."
        NEW_SECRET=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
        sed -i '/^AUTH_SECRET=/d' "$ENV_FILE"
        echo "AUTH_SECRET=$NEW_SECRET" >> "$ENV_FILE"
        echo "AUTH_SECRET generated successfully."
    fi
    AUTH_SECRET=$(grep "^AUTH_SECRET=" "$ENV_FILE" | cut -d'=' -f2)
    export AUTH_SECRET
fi

export PYTHONPATH=/code
export ALEMBIC_CONFIG=/code/alembic.ini

echo "Ensuring Alembic versions directory exists..."
mkdir -p /code/alembic/versions

echo "Resetting Alembic history to 'base'..."
alembic stamp base

echo "Attempting to create a new Alembic revision based on current models..."
alembic revision --autogenerate -m "Auto init on start"

echo "Applying database migrations..."
alembic upgrade head

echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
