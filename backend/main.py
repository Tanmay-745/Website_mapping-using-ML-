from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import warnings
from pydantic import BaseModel
from translator_logic import TranslatorCore
import os
import json
import time
import httpx
from typing import List, Optional

warnings.filterwarnings('ignore')

app = FastAPI(title="Legal Mapping ML Backend")

# Add CORS middleware to allow Next.js frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your Next.js URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ML Setup ---
print("Loading Sentence Transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded!")

translator_core = TranslatorCore()

# --- Shared Data Store (In-memory) ---
shared_data = {
    "headers": [],
    "sampleData": [],
    "deliveryMode": "digital",
    "timestamp": None
}

# --- File Persistence Setup ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ADVOCATES_FILE = os.path.join(DATA_DIR, "advocates.json")
LENDERS_FILE = os.path.join(DATA_DIR, "lenders.json")
NOTICE_TYPES_FILE = os.path.join(DATA_DIR, "notice_types.json")
TEMPLATES_DIR = os.path.join(DATA_DIR, "templates")

for path in [DATA_DIR, TEMPLATES_DIR]:
    if not os.path.exists(path):
        os.makedirs(path)

def load_json(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

class TranslationRequest(BaseModel):
    text: str
    dest: str

class GenerateRequest(BaseModel):
    prompt: str
    context: dict
    apiKey: Optional[str] = None

target_columns = [
    "full_name", "dpd", "total_outstanding_amt", "email", "phone_num", 
    "address", "lan", "office_Address", "pincode", "language", "state", 
    "loan_amount", "regional_manager", "regional_manager_phone_number", 
    "phone_number", "mobile_number", "agreement_date", "city", 
    "notice", "outstanding_amount", "store", "collection_manager", 
    "collection_manager_phone_number"
]

abbreviation_dict = {
    'rm': 'regional manager',
    'acm': 'collection manager',
    'lan': 'loan account number',
    'dpd': 'days past due',
    'amt': 'amount',
    'num': 'number',
    'no': 'number',
    'zip': 'pincode', 
    'mobile/contact':'phone number',
    'location':'address'
}

def clean_and_expand_column_name(col_name):
    words = str(col_name).lower().replace('_', ' ').replace('/', ' ').split()
    expanded_words = [abbreviation_dict.get(word, word) for word in words]
    return ' '.join(expanded_words)

# Pre-compute target embeddings at startup
clean_targets = [clean_and_expand_column_name(col) for col in target_columns]
target_embeddings = model.encode(clean_targets)


def semantic_match_column(raw_source_column_name):
    clean_source_col = clean_and_expand_column_name(raw_source_column_name)
    source_embedding = model.encode(clean_source_col)
    cosine_scores = util.cos_sim(source_embedding, target_embeddings)[0]
    
    best_match_index = cosine_scores.argmax().item()
    confidence_score = cosine_scores[best_match_index].item()
    best_match_name = target_columns[best_match_index]
    
    return best_match_name, confidence_score


import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("legal-mapping-api")

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"status": "Legal Mapping ML API is running"}


@app.post("/api/map-columns")
async def map_columns(file: UploadFile = File(...)):
    """
    Receives an Excel or CSV file from the frontend and returns the recommended column mappings.
    """
    logger.info(f"Received mapping request for file: {file.filename}")
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file, nrows=0) # Read only headers
        elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(file.file, nrows=0)
        else:
            logger.warning(f"Unsupported file format: {file.filename}")
            return {"error": "Unsupported file format. Please upload CSV or Excel."}
            
        messy_columns = df.columns.tolist()
        mappings = []
        
        logger.info(f"Mapping {len(messy_columns)} columns...")
        for col in messy_columns:
            sem_col, sem_conf = semantic_match_column(col)
            
            mappings.append({
                "source_column": col,
                "predicted_target": sem_col,
                "confidence_score": round(sem_conf, 2)
            })
            
        logger.info(f"Successfully mapped columns for {file.filename}")
        return {"filename": file.filename, "mappings": mappings}
        
    except Exception as e:
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        return {"error": f"Failed to process file: {str(e)}"}

# --- Shared Data Endpoints ---
@app.get("/api/share-data")
async def get_share_data():
    return shared_data

@app.post("/api/share-data")
async def set_share_data(data: dict):
    global shared_data
    shared_data = data
    shared_data["timestamp"] = time.time()
    return {"success": True}

# --- Advocate Management ---
@app.get("/api/advocates")
async def get_advocates():
    return load_json(ADVOCATES_FILE)

@app.post("/api/advocates")
async def save_advocate(advocate: dict):
    advocates = load_json(ADVOCATES_FILE)
    if "id" in advocate and advocate["id"]:
        for i, a in enumerate(advocates):
            if str(a.get("id")) == str(advocate["id"]):
                advocates[i] = advocate
                save_json(ADVOCATES_FILE, advocates)
                return {"success": True, "advocate": advocate}
    
    advocate["id"] = str(int(time.time() * 1000))
    advocates.append(advocate)
    save_json(ADVOCATES_FILE, advocates)
    return {"success": True, "advocate": advocate}

# --- Lender Management ---
@app.get("/api/lenders")
async def get_lenders():
    return load_json(LENDERS_FILE)

@app.post("/api/lenders")
async def save_lender(lender: dict):
    lenders = load_json(LENDERS_FILE)
    lender["id"] = f"lender_{int(time.time())}"
    lenders.append(lender)
    save_json(LENDERS_FILE, lenders)
    return {"success": True, "lender": lender}

# --- OpenAI Proxy ---
@app.post("/api/generate")
async def generate_notice(request: GenerateRequest):
    api_key = request.apiKey or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OpenAI API Key not configured"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": "You are an expert legal assistant. Output professional HTML."},
                        {"role": "user", "content": f"Context: {request.context}\n\nTask: {request.prompt}"}
                    ]
                },
                timeout=60.0
            )
            data = response.json()
            if "error" in data:
                return {"error": data["error"]["message"]}
            
            result = data["choices"][0]["message"]["content"]
            result = result.replace("```html", "").replace("```", "").strip()
            return {"result": result}
        except Exception as e:
            return {"error": str(e)}

# --- Translation Endpoints ---
@app.post("/api/translate")
async def translate(request: TranslationRequest):
    try:
        translated_text = translator_core.translate_text(request.text, request.dest)
        return {"translatedText": translated_text}
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return {"error": str(e)}

@app.get("/api/languages")
async def languages():
    return translator_core.get_supported_languages()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
