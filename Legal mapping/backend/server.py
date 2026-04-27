from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from typing import Dict

app = FastAPI(title="Legal Mapping Persistence API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
TEMPLATES_FILE = os.path.join(DATA_DIR, "templates.json")

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def load_templates():
    if not os.path.exists(TEMPLATES_FILE):
        return {}
    try:
        with open(TEMPLATES_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading templates: {e}")
        return {}

def save_templates(templates):
    try:
        with open(TEMPLATES_FILE, 'w') as f:
            json.dump(templates, f, indent=2)
    except Exception as e:
        print(f"Error saving templates: {e}")
        raise HTTPException(status_code=500, detail="Could not save templates")

@app.get("/api/templates")
async def get_templates():
    return load_templates()

@app.post("/api/templates")
async def update_templates(templates: Dict[str, Dict[str, str]]):
    save_templates(templates)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
