# ==============================================================================
# TruthLens Backend Production Dockerfile
# Multi-stage lean build for Node.js Express verification service
# ==============================================================================

FROM node:20-alpine AS base
WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source and contracts
COPY src ./src
COPY ../contracts ./contracts
COPY ../kb ./kb

# Configure production environment
ENV NODE_ENV=production
ENV PORT=8000

# Expose API port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start production server
CMD ["node", "src/server.js"]
