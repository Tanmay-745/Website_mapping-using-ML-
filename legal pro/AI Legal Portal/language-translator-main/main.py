from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from translator_logic import TranslatorCore
import uvicorn
import os

app = FastAPI()

# Enable CORS for local web application development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

translator_core = TranslatorCore()

class TranslationRequest(BaseModel):
    text: str
    dest: str

@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        translated_text = translator_core.translate_text(request.text, request.dest)
        return {"translatedText": translated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/languages")
async def languages():
    return translator_core.get_supported_languages()

# Serve static files (HTML, CSS, JS) from the current directory
app.mount("/", StaticFiles(directory=".", html=True), name="static")

@app.get("/")
async def root():
    return FileResponse("index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
