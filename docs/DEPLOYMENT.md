# TruthLens Deployment & Production Configuration Guide

This guide details the deployment architecture, configuration steps, and operational runbook for deploying **TruthLens** in production environments.

---

## 1. System Architecture

```mermaid
flowchart LR
    Client([Client Browser]) -->|HTTP Port 80| Nginx[Nginx Reverse Proxy & Static SPA]
    Nginx -->|Static Assets| WebApp[React SPA Bundle]
    Nginx -->|/api/* (Port 8000)| ExpressAPI[Node.js Express API]
    
    ExpressAPI --> LRUCache[In-Memory LRU Cache]
    ExpressAPI --> GroundedRetrieval[Curated KB + FactCheck API]
    ExpressAPI --> Gemini[Google Gemini Multimodal AI]
```

---

## 2. Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8000` | Port for Express API server |
| `NODE_ENV` | Yes | `production` | Node runtime environment |
| `FRONTEND_ORIGIN` | Yes | `http://localhost` | Comma-separated CORS allowed origins |
| `REQUEST_TIMEOUT_MS`| No | `90000` | Global timeout per request (ms) |
| `GEMINI_API_KEY` | Yes | - | Google Gemini AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini generative model |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_USE_MOCK` | No | `false` | Default mode on launch (`false` = Live AI, `true` = Demo) |
| `VITE_API_BASE_URL`| No | `/api` | Base path for API requests |

---

## 3. Option A: Docker Compose Deployment (Recommended)

Full-stack containerized deployment with health checking, reverse proxying, and automated networking.

### Steps:
1. Populate your environment key:
   ```bash
   export GEMINI_API_KEY="AIzaSy..."
   ```
2. Build and start containers in detached mode:
   ```bash
   docker-compose up --build -d
   ```
3. Verify health status:
   ```bash
   docker-compose ps
   ```
4. Access TruthLens at `http://localhost` (Port 80).

To shut down:
```bash
docker-compose down
```

---

## 4. Option B: Standalone / Process Manager (PM2 + Nginx)

### Backend with PM2:
```bash
cd backend
npm install --omit=dev
pm2 start src/server.js --name "truthlens-api" -i max
pm2 save
```

### Frontend Build:
```bash
cd frontend
npm install
npm run build
# Deploy 'dist/' folder to /var/www/truthlens or Nginx html root
```

---

## 5. Production Health & Operations

### Health Check Endpoint
- **URL**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-10T07:15:00.000Z",
    "uptimeSeconds": 1420,
    "memory": { ... },
    "hasGeminiKey": true
  }
  ```

### Cache Management Endpoints
- **Inspect Cache Metrics**: `GET /api/cache/stats`
  ```json
  { "size": 12, "maxSize": 500, "hits": 45, "misses": 12, "hitRate": "78.9%" }
  ```
- **Clear Cache**: `POST /api/cache/clear`
  ```json
  { "success": true, "message": "Verification cache cleared." }
  ```

---

## 6. Live Demo Presenter Safeguards

- **Interactive Mode Switcher**: In the application header, toggle between **Live AI** and **Demo Fixtures** with one click.
- **Failover Protection**: If internet connection drops during a live presentation, TruthLens provides an instant *"Switch to Demo Mode & Retry"* prompt so the presentation never crashes.
