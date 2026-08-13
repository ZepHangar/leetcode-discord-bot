#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  : "${POSTGRES_USER:?Missing required environment variable: POSTGRES_USER}"
  : "${POSTGRES_PASSWORD:?Missing required environment variable: POSTGRES_PASSWORD}"
  : "${POSTGRES_DB:?Missing required environment variable: POSTGRES_DB}"

  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
fi

bunx prisma migrate deploy

exec "$@"
