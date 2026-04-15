#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
  echo "APP_KEY is required"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

php artisan config:clear >/dev/null 2>&1 || true

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" >/dev/null 2>&1; do
    echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
    sleep 2
  done

  php artisan migrate --force

  if [ "${RUN_SEEDERS:-true}" = "true" ]; then
    php artisan db:seed --force
  fi
fi

exec php artisan serve --host=0.0.0.0 --port=8000
