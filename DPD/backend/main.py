from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routers import allocations, settings, notifications, auth, recovery_rate

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collection Management API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
import os

# Mount uploads directory
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="backend"), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to Collection Management API"}

app.include_router(allocations.router)
app.include_router(settings.router)
app.include_router(notifications.router)
app.include_router(auth.router)
app.include_router(recovery_rate.router)
if __name__ == "__main__":
    import uvicorn
    print("Starting Uvicorn...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
