# ==============================================================================
# TruthLens Frontend Production Dockerfile
# Multi-stage build: Vite React compile -> Nginx Alpine reverse proxy
# ==============================================================================

# Stage 1: Build React SPA
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy frontend source and contracts reference
COPY . .

# Build production bundle
ENV VITE_USE_MOCK=false
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: Lightweight Nginx server
FROM nginx:alpine AS runner

# Copy custom Nginx proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
