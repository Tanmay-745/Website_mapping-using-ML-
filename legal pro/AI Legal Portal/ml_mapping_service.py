import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from sentence_transformers import SentenceTransformer, util
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import re
import os
import mammoth
from googletrans import Translator
from googletrans import LANGUAGES

class TranslatorCore:
    def __init__(self):
        self.translator = Translator()

    def translate_text(self, text, dest):
        if not text:
            return ""
        
        # Identify and protect placeholders { } or ${ }
        placeholders = re.findall(r'(\$\{.*?\}|\{.*?\})', text)
        tokenized_text = text
        for i, placeholder in enumerate(placeholders):
            tokenized_text = tokenized_text.replace(placeholder, f" _P{i}_ ", 1)

        try:
            translated_obj = self.translator.translate(tokenized_text, dest=dest)
            translated_text = translated_obj.text
            
            # Restore placeholders
            for i, placeholder in enumerate(placeholders):
                # Handle potential case changes by googletrans
                translated_text = translated_text.replace(f"_P{i}_", placeholder).replace(f"_p{i}_", placeholder)
                # Also handle cases where spaces might have been added around tokens
                translated_text = translated_text.replace(f" _P{i}_ ", placeholder).replace(f" _p{i}_ ", placeholder)
            
            return translated_text
        except Exception as e:
            print(f"Translation logic error: {e}")
            return text # Fallback to original text

translator_core = TranslatorCore()

app = FastAPI(title="Legal Portal AI/ML Service")

# 1. Load the Semantic Search Model
print("Loading Sentence Transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded!")

# 2. Load Translation Model (English to Hindi)
print("Loading Translation Model (En-Hi)...")
model_name = "Helsinki-NLP/opus-mt-en-hi"
translator_tokenizer = AutoTokenizer.from_pretrained(model_name)
translator_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
print("Translation model loaded!")

# Configuration
NOTICE_FOLDER = r'd:\legal V0\legal pro\AI Legal Portal\Notice folder'

# In-memory store for indexed templates
indexed_templates = []

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Standardize: lowercase, remove special chars but keep newlines/spaces
    t = text.lower()
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return ' '.join(t.split())

def index_all_notices():
    global indexed_templates
    indexed_templates = []
    print(f"Indexing notices in {NOTICE_FOLDER}...")
    
    if not os.path.exists(NOTICE_FOLDER):
        print("Warning: Notice folder not found!")
        return

    if not os.path.isdir(NOTICE_FOLDER):
        print(f"Warning: {NOTICE_FOLDER} is not a directory!")
        return

    for filename in os.listdir(NOTICE_FOLDER):
        if filename.endswith('.docx') and not '- Copy' in filename:
            filepath = os.path.join(NOTICE_FOLDER, filename)
            try:
                with open(filepath, "rb") as docx_file:
                    result = mammoth.extract_raw_text(docx_file)
                    raw_text = result.value
                    cleaned = clean_text(raw_text)
                    
                    # Store filename, raw content, and embedding for semantic search
                    embedding = model.encode(cleaned)
                    indexed_templates.append({
                        "filename": filename,
                        "content": raw_text,
                        "embedding": embedding
                    })
                print(f"Indexed: {filename}")
            except Exception as e:
                print(f"Error indexing {filename}: {e}")
    
    print(f"Total notices indexed: {len(indexed_templates)}")

# Initial indexing
index_all_notices()

class MapRequest(BaseModel):
    placeholders: List[str]
    source_columns: List[str]

class MappingSuggestion(BaseModel):
    placeholder: str
    suggested_column: str
    confidence: float

class GenerateRequest(BaseModel):
    prompt: str
    context: Optional[Dict] = None

class GenerateResponse(BaseModel):
    result: str
    source_template: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "hi"  # Default to Hindi

class TranslateResponse(BaseModel):
    translated_text: str

@app.get("/health")
async def health():
    return {"status": "ok", "indexed_count": len(indexed_templates)}

@app.post("/map", response_model=List[MappingSuggestion])
async def map_variables(request: MapRequest):
    try:
        clean_sources = [clean_text(col) for col in request.source_columns]
        source_embeddings = model.encode(clean_sources)
        results = []
        
        for placeholder in request.placeholders:
            placeholder_embedding = model.encode(clean_text(placeholder))
            cosine_scores = util.cos_sim(placeholder_embedding, source_embeddings)[0]
            best_match_idx = int(np.argmax(cosine_scores))
            confidence = float(cosine_scores[best_match_idx])
            
            results.append(MappingSuggestion(
                placeholder=placeholder,
                suggested_column=request.source_columns[best_match_idx],
                confidence=round(confidence, 4)
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-notice", response_model=GenerateResponse)
async def generate_notice(request: GenerateRequest):
    if not indexed_templates:
        raise HTTPException(status_code=404, detail="No templates indexed. Check Notice folder.")
    
    try:
        # 1. Semantic Search for the best template
        query_embedding = model.encode(clean_text(request.prompt))
        template_embeddings = np.array([t['embedding'] for t in indexed_templates])
        
        cosine_scores = util.cos_sim(query_embedding, template_embeddings)[0]
        best_idx = int(np.argmax(cosine_scores))
        best_template = indexed_templates[best_idx]
        
        content = best_template['content']
        
        # If context (variables) are provided, auto-fill them
        if request.context:
            for key, value in request.context.items():
                if value:
                    content = content.replace(f"${{{key}}}", str(value))
        
        # Format as simple HTML for the editor
        html_content = content.replace('\n', '<br>')
        
        return GenerateResponse(
            result=html_content,
            source_template=best_template['filename']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    try:
        # Map target language if necessary (e.g. "hi" stays "hi", "hindi" -> "hi")
        target_lang = request.target_lang.lower()
        if target_lang in LANGUAGES:
            dest = target_lang
        else:
            # Try to find by name
            dest = None
            for code, name in LANGUAGES.items():
                if name.lower() == target_lang:
                    dest = code
                    break
            
            if not dest:
                # Default to English if not found, though ideally we should error or fallback
                dest = "en"

        translated = translator_core.translate_text(request.text, dest)
        return TranslateResponse(translated_text=translated)
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
