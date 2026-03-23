# AI Legal Portal - Development Guide

This document provides technical details on the portal's architecture, inter-app communication, and build processes.

## 🏗️ Architecture

The portal is designed as a modular suite of web applications (Vite, Next.js, Express) connected through a unified gateway and shared ML backend.

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Gateway | Vite/HTML | 8080 | Entry point for all services |
| Backend | FastAPI | 8000 | ML & Semantic Processing |
| Dashboard | Vite/React | 3002 | Analytics & User Mgmt |
| AI Notices| Vite/React | 3001 | Document Generation |
| Mapping | Vite/React | 5173 | Data Ingestion |
| Barcode | Next.js | 3000 | Tracking Labels |
| Cover Letter| Express | 5001 | PDF Processing |

## 🔗 Inter-App Communication

### Environment Variables
Shared configuration is managed at the root in `.env`. Use `npm run sync-env` to propagate these values to all sub-directories. 

### Common Variables:
- `VITE_BACKEND_URL`: Points to the FastAPI service.
- `VITE_SUPABASE_URL`: Database connection for notice generation.

## 📦 Build Pipeline

The root `package.json` contains a robust build script that:
1. Creates a `dist/` folder hierarchy.
2. Triggers `build` commands for each sub-app.
3. Consolidates production bundles into:
   - `dist/index.html` (Gateway)
   - `dist/dashboard/`
   - `dist/ai/`
   - `dist/mapping/`
   - `dist/barcode/` (Next.js static export)

## 🧪 Testing

Each sub-app maintains its own test suite. Run tests individually within sub-directories:
```bash
cd "Legal mapping" && npm run test
```
