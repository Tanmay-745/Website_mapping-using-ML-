import os
import re
import torch
import numpy as np
import mammoth
import uvicorn
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer, util
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from googletrans import Translator, LANGUAGES
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
            if GEMINI_API_KEY:
                gemini_model = genai.GenerativeModel('gemini-2.5-flash')
                prompt = f"""
                Translate the following legal text to {dest}.
                IMPORTANT: 
                1. Preserve all placeholders like ${{...}} or {{...}} exactly as they are.
                2. Use professional legal terminology appropriate for the target language.
                3. Return ONLY the translated text.
                
                Text: {text}
                """
                response = gemini_model.generate_content(prompt)
                return response.text.strip()
            
            # Fallback to googletrans
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

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment!")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini initialized.")

# 1. Load the Semantic Search Model (Legacy / Fallback)
print("Loading Sentence Transformer model (Fallback)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded!")

# 2. Load Translation Model (Legacy Fallback)
print("Loading Translation Model (En-Hi Fallback)...")
model_name = "Helsinki-NLP/opus-mt-en-hi"
translator_tokenizer = AutoTokenizer.from_pretrained(model_name)
translator_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
print("Translation model loaded!")

# Configuration
NOTICE_FOLDER = r'd:\legal V0\legal pro\AI Legal Portal\Notice folder'

# Target Headers for Column Mapping (Synced with frontend)
TARGET_HEADERS_LIST = [
    "name", "dpd", "total outstanding amt", "email", "phone num",
    "address", "lan", "office Address", "pincode", "language", "state",
    "loan amount", "regional manager", "regional manager phone number",
    "phone number", "mobile number", "agreement date", "city",
    "notice", "outstanding amount", "store", "collection manager",
    "collection manager phone number", "co-borrower", "barcode"
]

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
    """
    Highly accurate CSV column mapping using Gemini 1.5 Flash.
    """
    if not GEMINI_API_KEY:
        # Fallback to local model if API key is missing
        return await map_variables_fallback(request)

    try:
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert data migration specialist. I have a list of source columns from a CSV file and a list of target headers for a legal portal database.
        
        Source Columns: {request.source_columns}
        Target Headers: {TARGET_HEADERS_LIST}
        
        Map each source column to the MOST RELEVANT target header ONLY from the provided list. 
        Rules:
        1. If a source column does not have a clear match in the Target Headers, map it to empty string "" or representation 'null'.
        2. Pay attention to legal context:
           - 'LRN', 'LAN', 'Loan No', 'Account Number' MUST map to 'lan'.
           - 'DPD' MUST map to 'dpd'.
           - 'Outstanding', 'Bal', 'Total outstanding amt' MUST map to 'total outstanding amt'.
           - 'Mob', 'Phone', 'Contact' MUST map to 'phone number' or 'mobile number'.
        3. Provide a confidence score (0.0 to 1.0) for each mapping.
        4. Return the result strictly as a valid JSON list of objects: [{{"placeholder": "source_column", "suggested_column": "target_header", "confidence": 0.95}}]
        """
        
        response = gemini_model.generate_content(prompt)
        # Extract JSON from response (handling potential markdown formatting)
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
            
        import json
        mapping_data = json.loads(json_str)
        
        results = []
        for item in mapping_data:
            results.append(MappingSuggestion(
                placeholder=item['placeholder'],
                suggested_column=item['suggested_column'] if item['suggested_column'] != 'null' else '',
                confidence=round(float(item['confidence']), 4)
            ))
        return results
    except Exception as e:
        print(f"Gemini Mapping Error: {e}. Falling back to local model.")
        return await map_variables_fallback(request)

async def map_variables_fallback(request: MapRequest):
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
        # 1. Use Gemini to find the best template and explain why
        if GEMINI_API_KEY:
            gemini_model = genai.GenerativeModel('gemini-2.5-flash')
            template_names = [t['filename'] for t in indexed_templates]
            
            prompt = f"""
            You are a legal assistant. A user wants to generate a notice for this purpose: "{request.prompt}"
            Available templates: {template_names}
            
            Identify the MOST suitable template. If multiple seem relevant, pick the best one.
            Return ONLY the filename of the template, e.g., "Loan_Recall_Notice.docx".
            """
            response = gemini_model.generate_content(prompt)
            best_filename = response.text.strip().replace('"', '').replace("'", "")
            
            best_template = next((t for t in indexed_templates if t['filename'] == best_filename), None)
            if not best_template:
                # Fallback to semantic search
                best_template = await get_best_template_semantic(request.prompt)
        else:
            best_template = await get_best_template_semantic(request.prompt)
            
        content = best_template['content']
        
        # 3. Use Gemini to intelligently fill placeholders if context is complex
        if request.context and GEMINI_API_KEY:
            # For now, simple replacement is faster for large batches, 
            # but Gemini can help if keys don't match exactly.
            for key, value in request.context.items():
                if value:
                    # Case insensitive replacement for better accuracy
                    pattern = re.compile(re.escape(f"${{{key}}}"), re.IGNORECASE)
                    content = pattern.sub(str(value), content)
                    # Also handle simpler {key} format
                    pattern_alt = re.compile(re.escape(f"{{{key}}}"), re.IGNORECASE)
                    content = pattern_alt.sub(str(value), content)
        elif request.context:
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
        print(f"Generate Notice Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_best_template_semantic(prompt: str):
    query_embedding = model.encode(clean_text(prompt))
    template_embeddings = np.array([t['embedding'] for t in indexed_templates])
    cosine_scores = util.cos_sim(query_embedding, template_embeddings)[0]
    best_idx = int(np.argmax(cosine_scores))
    return indexed_templates[best_idx]

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
    uvicorn.run(app, host="0.0.0.0", port=8001)
