#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client (in case schema changed)..."
npx prisma generate

echo "Starting application..."
exec "$@"
