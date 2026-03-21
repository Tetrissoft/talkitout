#!/bin/sh
set -e

echo "🚀 Starting TalkItOut Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0
until echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database not ready after ${MAX_RETRIES} attempts, proceeding anyway..."
    break
  fi
  echo "  Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done
echo "✅ Database is ready"

# Run migrations (uses committed migration files)
echo "📦 Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied successfully"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Start the application
echo "✨ Starting NestJS application..."
exec npm run start:prod
