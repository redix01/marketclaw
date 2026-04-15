#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/.deploy"
BACKEND_ENV="${DEPLOY_DIR}/backend.env"
POSTGRES_ENV="${DEPLOY_DIR}/postgres.env"

mkdir -p "${DEPLOY_DIR}"

if [[ ! -f "${POSTGRES_ENV}" ]]; then
  cp "${DEPLOY_DIR}/postgres.env.example" "${POSTGRES_ENV}"
fi

if [[ ! -f "${BACKEND_ENV}" ]]; then
  cp "${DEPLOY_DIR}/backend.env.example" "${BACKEND_ENV}"
fi

if ! grep -q '^APP_KEY=base64:' "${BACKEND_ENV}"; then
  APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
  if grep -q '^APP_KEY=' "${BACKEND_ENV}"; then
    sed -i.bak "s#^APP_KEY=.*#APP_KEY=${APP_KEY}#" "${BACKEND_ENV}"
    rm -f "${BACKEND_ENV}.bak"
  else
    printf '\nAPP_KEY=%s\n' "${APP_KEY}" >> "${BACKEND_ENV}"
  fi
fi

if grep -q '^POSTGRES_PASSWORD=' "${POSTGRES_ENV}"; then
  POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' "${POSTGRES_ENV}" | cut -d= -f2-)"
  if grep -q '^DB_PASSWORD=' "${BACKEND_ENV}"; then
    sed -i.bak "s#^DB_PASSWORD=.*#DB_PASSWORD=${POSTGRES_PASSWORD}#" "${BACKEND_ENV}"
    rm -f "${BACKEND_ENV}.bak"
  else
    printf '\nDB_PASSWORD=%s\n' "${POSTGRES_PASSWORD}" >> "${BACKEND_ENV}"
  fi
fi

docker compose pull postgres || true
docker compose up -d --build
