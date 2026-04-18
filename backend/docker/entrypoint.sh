#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ]; then
  echo "APP_KEY is required"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

write_env() {
  key="$1"
  value="$2"

  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

write_env "APP_NAME" "${APP_NAME:-Laravel}"
write_env "APP_ENV" "${APP_ENV:-production}"
write_env "APP_KEY" "${APP_KEY}"
write_env "APP_DEBUG" "${APP_DEBUG:-false}"
write_env "APP_URL" "${APP_URL:-http://localhost}"
write_env "FRONTEND_URLS" "${FRONTEND_URLS:-}"
write_env "DB_CONNECTION" "${DB_CONNECTION:-sqlite}"
write_env "DB_HOST" "${DB_HOST:-127.0.0.1}"
write_env "DB_PORT" "${DB_PORT:-5432}"
write_env "DB_DATABASE" "${DB_DATABASE:-laravel}"
write_env "DB_USERNAME" "${DB_USERNAME:-root}"
write_env "DB_PASSWORD" "${DB_PASSWORD:-}"
write_env "SESSION_DRIVER" "${SESSION_DRIVER:-database}"
write_env "QUEUE_CONNECTION" "${QUEUE_CONNECTION:-database}"
write_env "CACHE_STORE" "${CACHE_STORE:-database}"

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

php artisan schedule:work >/tmp/marketclaw-schedule.log 2>&1 &

exec php artisan serve --host=0.0.0.0 --port=8000
