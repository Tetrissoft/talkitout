# Multi-stage Production Dockerfile for NestJS Backend

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (use npm install if no lock file exists)
RUN  npm install

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy source code and prisma
COPY . .

# Ensure Prisma Client is generated
RUN npx prisma generate

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && ls -la dist/src/

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma and wget for healthcheck
RUN apk add --no-cache openssl libc6-compat wget

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (use npm install if no lock file exists)
RUN npm install --production && npm cache clean --force

# Copy Prisma Client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Expose port (matches PORT env var in docker-compose)
EXPOSE 3061

# Healthcheck (uses PORT env var, defaults to 3061)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3061}/api || exit 1

# Start the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]
