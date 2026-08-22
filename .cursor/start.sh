#!/usr/bin/env bash
# Per-boot startup for the eGerak v2 Cloud Agent environment.
# Idempotently brings up a local Postgres cluster (owned by the current user)
# and ensures the app database exists. Safe to run on every boot.
set -euo pipefail

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
if [ -z "${PGBIN}" ]; then
  echo "PostgreSQL server binaries not found. Run the install script first." >&2
  exit 1
fi

export PGDATA="${PGDATA:-$HOME/pgdata}"
PGSOCK="${PGSOCK:-$HOME/pgrun}"
PGUSER_NAME="$(id -un)"
DB_NAME="egerak"

mkdir -p "${PGSOCK}"

if [ ! -s "${PGDATA}/PG_VERSION" ]; then
  echo "Initializing Postgres cluster at ${PGDATA}"
  "${PGBIN}/initdb" -D "${PGDATA}" -U "${PGUSER_NAME}" --auth=trust --encoding=UTF8 >/dev/null
  {
    echo "listen_addresses = 'localhost'"
    echo "port = 5432"
    echo "unix_socket_directories = '${PGSOCK}'"
  } >> "${PGDATA}/postgresql.conf"
fi

if ! "${PGBIN}/pg_ctl" -D "${PGDATA}" status >/dev/null 2>&1; then
  echo "Starting Postgres"
  "${PGBIN}/pg_ctl" -D "${PGDATA}" -l "${PGDATA}/server.log" -w -o "-k ${PGSOCK}" start
fi

for _ in $(seq 1 30); do
  if "${PGBIN}/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! "${PGBIN}/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "Postgres did not become ready in time." >&2
  cat "${PGDATA}/server.log" >&2 || true
  exit 1
fi

if ! "${PGBIN}/psql" -h 127.0.0.1 -U "${PGUSER_NAME}" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "Creating database ${DB_NAME}"
  "${PGBIN}/psql" -h 127.0.0.1 -U "${PGUSER_NAME}" -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

echo "Postgres is ready on 127.0.0.1:5432 (database: ${DB_NAME})."
