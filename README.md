# AI Legal Portal | Unified Gateway

A professional suite of AI-powered legal tools for automated notice generation, semantic data mapping, barcode management, and bulk document processing.

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or later
- **Python**: v3.9 or later

### 2. Setup
Clone the repository and run the unified installation command:
```bash
npm run install:all
```

### 3. Configuration
Copy the environment template and fill in your variables:
```bash
cp .env.example .env
npm run sync-env
```

### 4. Running the Portal
Start all 5 sub-applications and the ML backend concurrently:
```bash
npm run dev
```
The gateway will be available at [http://localhost:8080](http://localhost:8080).

## 📂 Project Structure

- **`/dashboard`**: Central management and status tracking.
- **`/legal pro/AI Legal Portal`**: AI-driven legal notice generation.
- **`/Legal mapping`**: Semantic field detection for CSV/Excel uploads.
- **`/Barcode-1`**: Physical document tracking and barcode generation.
- **`/CoverLetterApp`**: Bulk PDF merging and cover letter creation.
- **`/backend`**: FastAPI ML service for semantic processing.

## 🛠️ Combined Build
To build the entire suite for deployment:
```bash
npm run build
```
The unified production assets will be generated in the `dist/` directory.

---
&copy; 2026 AI Legal Portal Team
