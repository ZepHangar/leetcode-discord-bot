#!/bin/sh
set -eu

POSTGRES_ENTRYPOINT="/usr/local/bin/docker-entrypoint.sh"
PGDATA_DIR="${PGDATA:-/var/lib/postgresql/data}"

sql_escape_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

sql_escape_ident() {
  printf '%s' "$1" | sed 's/"/""/g'
}

single_user_sql() {
  database="$1"
  sql="$2"
  printf '%s\n' "$sql" | su postgres -c "postgres --single -D '$PGDATA_DIR' '$database'" >/dev/null
}

single_user_output() {
  database="$1"
  sql="$2"
  printf '%s\n' "$sql" | su postgres -c "postgres --single -D '$PGDATA_DIR' '$database'" 2>/dev/null
}

# If database not initialized, run default entrypoint
if [ ! -s "$PGDATA_DIR/PG_VERSION" ]; then
  exec "$POSTGRES_ENTRYPOINT" postgres
fi

DB_USER_IDENT=$(sql_escape_ident "$POSTGRES_USER")
DB_PASSWORD_LITERAL=$(sql_escape_literal "$POSTGRES_PASSWORD")
DB_NAME_IDENT=$(sql_escape_ident "$POSTGRES_DB")
DB_NAME_LITERAL=$(sql_escape_literal "$POSTGRES_DB")
DB_USER_LITERAL=$(sql_escape_literal "$POSTGRES_USER")

# Ensure role exists
if single_user_output postgres "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER_LITERAL}';" | grep -q '^[[:space:]]*1[[:space:]]*$'; then
  single_user_sql postgres "ALTER ROLE \"${DB_USER_IDENT}\" WITH LOGIN PASSWORD '${DB_PASSWORD_LITERAL}';"
else
  single_user_sql postgres "CREATE ROLE \"${DB_USER_IDENT}\" LOGIN PASSWORD '${DB_PASSWORD_LITERAL}';"
fi

# Ensure database exists
if ! single_user_output postgres "SELECT 1 FROM pg_catalog.pg_database WHERE datname = '${DB_NAME_LITERAL}';" | grep -q '^[[:space:]]*1[[:space:]]*$'; then
  single_user_sql postgres "CREATE DATABASE \"${DB_NAME_IDENT}\" OWNER \"${DB_USER_IDENT}\";"
fi

# Start postgres normally
exec "$POSTGRES_ENTRYPOINT" postgres
