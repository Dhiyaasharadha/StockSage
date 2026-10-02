# Multi-stage production build for Stock Sage on Google Cloud Run
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copy source code and config
COPY . .

# Run production build during container image creation
# Pre-bundles frontend assets and pre-computes static caches
RUN npm run build

# Production runtime container
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production --prefer-offline --no-audit

# Copy built frontend assets and server files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/.env.example ./.env.example

# Expose port (Cloud Run sets PORT=8080 or PORT=3000 at runtime)
EXPOSE 3000

# Persistent single-service startup
CMD ["npm", "start"]
