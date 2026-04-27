import os
import json
import time
import httpx
from fastapi import FastAPI, Request, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uvicorn
import re
import asyncio
from deep_translator import GoogleTranslator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = 54321
ML_BACKEND_PORT = 8003

# In-memory store
shared_data = {
    "headers": [],
    "sampleData": [],
    "deliveryMode": "digital",
    "timestamp": None
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Lightweight .env loader
try:
    env_path = os.path.join(BASE_DIR, '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                match = re.match(r'^([^=:]+?)[=:](.*)', line)
                if match:
                    key = match.group(1).strip()
                    val = match.group(2).strip().strip("'\"")
                    if key not in os.environ:
                        os.environ[key] = val
except Exception as e:
    print(f"Could not load .env file: {e}")

# File paths
ADVOCATES_FILE = os.path.join(BASE_DIR, 'advocates.json')
LENDERS_FILE = os.path.join(BASE_DIR, 'lenders.json')
NOTICE_TYPES_FILE = os.path.join(BASE_DIR, 'notice_types.json')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'Notice folder')

if not os.path.exists(LENDERS_FILE):
    with open(LENDERS_FILE, 'w') as f:
        json.dump([], f)
if not os.path.exists(TEMPLATES_DIR):
    os.makedirs(TEMPLATES_DIR)

def load_json(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception:
        return []

def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

@app.get("/health")
@app.get("/functions/v1/server/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/share-data")
async def post_share_data(request: Request):
    global shared_data
    data = await request.json()
    shared_data = {**data, "timestamp": int(time.time() * 1000)}
    return {"success": True}

@app.get("/api/share-data")
def get_share_data():
    return shared_data

@app.get("/api/advocates")
def get_advocates():
    return load_json(ADVOCATES_FILE)

@app.post("/api/advocates")
async def save_advocate(request: Request):
    advocates = load_json(ADVOCATES_FILE)
    advocate_data = await request.json()
    
    existing_index = next((i for i, a in enumerate(advocates) if str(a.get("id")) == str(advocate_data.get("id"))), -1)
    
    if existing_index > -1:
        advocates[existing_index].update(advocate_data)
        save_json(ADVOCATES_FILE, advocates)
        return {"success": True, "advocate": advocates[existing_index]}
    else:
        new_advocate = {**advocate_data, "id": str(int(time.time() * 1000))}
        advocates.append(new_advocate)
        save_json(ADVOCATES_FILE, advocates)
        return {"success": True, "advocate": new_advocate}

@app.delete("/api/advocates")
def delete_advocate(id: str = Query(..., description="ID of the advocate to delete")):
    advocates = load_json(ADVOCATES_FILE)
    filtered = [a for a in advocates if str(a.get("id")) != id and str(a.get("name")) != id]
    save_json(ADVOCATES_FILE, filtered)
    return {"success": True}

@app.get("/api/lenders")
def get_lenders():
    return load_json(LENDERS_FILE)

@app.post("/api/lenders")
async def save_lender(request: Request):
    lenders = load_json(LENDERS_FILE)
    new_lender = {**(await request.json()), "id": f"lender_{int(time.time() * 1000)}"}
    lenders.append(new_lender)
    save_json(LENDERS_FILE, lenders)
    return {"success": True, "lender": new_lender}

@app.delete("/api/lenders")
def delete_lender(id: str):
    lenders = load_json(LENDERS_FILE)
    filtered = [l for l in lenders if str(l.get("id")) != id]
    save_json(LENDERS_FILE, filtered)
    return {"success": True}

@app.get("/api/notice-types")
def get_notice_types():
    return load_json(NOTICE_TYPES_FILE)

@app.post("/api/notice-types")
async def save_notice_type(request: Request):
    types = load_json(NOTICE_TYPES_FILE)
    new_type = {**(await request.json()), "id": f"type_{int(time.time() * 1000)}"}
    types.append(new_type)
    save_json(NOTICE_TYPES_FILE, types)
    return {"success": True, "noticeType": new_type}

@app.get("/api/templates/search")
def search_templates(lender: str = "", type: str = ""):
    files = os.listdir(TEMPLATES_DIR)
    matches = [f for f in files if lender.lower() in f.lower() or type.lower() in f.lower()]
    return matches

class TemplateSave(BaseModel):
    lender: Optional[str] = 'template'
    type: Optional[str] = 'notice'
    content: str

@app.post("/api/templates/save")
def save_template(data: TemplateSave):
    lender_str = re.sub(r'\s+', '_', data.lender or "template")
    type_str = re.sub(r'\s+', '_', data.type or "notice")
    filename = f"{lender_str}_{type_str}_{int(time.time() * 1000)}.html"
    
    with open(os.path.join(TEMPLATES_DIR, filename), 'w') as f:
        f.write(data.content)
    return {"success": True, "filename": filename}

class TemplateAnalyze(BaseModel):
    templateName: str

@app.post("/api/templates/analyze")
def analyze_template(data: TemplateAnalyze):
    filepath = os.path.join(TEMPLATES_DIR, data.templateName)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Template not found")
    with open(filepath, 'r') as f:
        content = f.read()
    
    matches = re.findall(r'\[\[(.*?)\]\]', content)
    unique_matches = list(set(matches))
    return {"placeholders": unique_matches}

@app.post("/api/ml/map-variables")
@app.post("/map")
async def ml_map_variables(request: Request):
    data = await request.json()
    payload = {
        "source_columns": data.get("source_columns") or data.get("placeholders"),
        "placeholders": data.get("placeholders") or data.get("source_columns")
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"http://localhost:{ML_BACKEND_PORT}/map", json=payload)
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"ML Service unavailable: {e}")

@app.post("/api/translate")
async def translate_text(request: Request):
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang") or data.get("dest")
    api_key = data.get("apiKey") or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY is not configured.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "system_instruction": {
            "parts": [{"text": f"You are an expert legal translator. Translate the provided text into {target_lang}. Maintain all HTML tags, structure, CSS styles, and FreeMarker template variables like ${{...}} and <#if ...> exactly as they are without translating them. CRITICAL RULE: If a legal term, Act name, Section, Bank Name, or complex sentence is difficult to understand naturally when translated into {target_lang}, you MUST keep that specific part in its original English. Ensure very high accuracy of legal terminology."}]
        },
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {"temperature": 0.1},
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    resp = await client.post(url, json=payload)
                    resp_data = resp.json()
                    
                    if "error" in resp_data:
                        raise Exception(resp_data["error"]["message"])
                        
                    if not resp_data.get("candidates") or not resp_data["candidates"][0].get("content"):
                        curr_error = "Safety filter blocked response"
                        if attempt == max_retries - 1:
                            return {"translated_text": text, "error": curr_error}
                        await asyncio.sleep(2 ** attempt)
                        continue
                        
                    result = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    result = re.sub(r'^```html\s*', '', result, flags=re.IGNORECASE)
                    result = re.sub(r'^```\s*', '', result)
                    result = re.sub(r'```$', '', result).strip()
                    
                    return {"translated_text": result}
                except Exception as e:
                    err_str = str(e).lower()
                    if attempt == max_retries - 1:
                        if "high demand" in err_str or "quota" in err_str or "429" in err_str or "503" in err_str or "unavailable" in err_str:
                            print(f"Gemini limit reached. Falling back to GoogleTranslator. Error: {e}")
                            try:
                                target = target_lang.lower().strip()
                                translator = GoogleTranslator(source='auto', target=target)
                                
                                tokens = []
                                def repl(match):
                                    tokens.append(match.group(0))
                                    return f" ZZZZ{len(tokens)-1}ZZZZ "
                                plain_text = re.sub(r'(<[^>]+>|\$\{[^}]+\})', repl, text)
                                
                                chunks, curr = [], ""
                                for part in plain_text.split('\n'):
                                    if len(curr) + len(part) > 4500:
                                        if curr: chunks.append(curr)
                                        curr = part + '\n'
                                    else:
                                        curr += part + '\n'
                                if curr: chunks.append(curr)
                                
                                translated_plain = "".join([translator.translate(c) for c in chunks if c.strip()])
                                
                                def restore(match):
                                    idx = int(match.group(1))
                                    return tokens[idx] if idx < len(tokens) else match.group(0)
                                    
                                fallback_translation = re.sub(r'ZZZZ\s*(\d+)\s*ZZZZ', restore, translated_plain, flags=re.IGNORECASE)
                                return {"translated_text": fallback_translation, "is_fallback": True}
                            except Exception as fallback_e:
                                print(f"Fallback translation failed: {fallback_e}")
                                raise e
                        raise e
                    if "high demand" in err_str or "quota" in err_str or "429" in err_str or "503" in err_str or "unavailable" in err_str:
                        await asyncio.sleep(2 ** attempt)
                    else:
                        raise e
        except Exception as e:
            print(f"Translation API error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate-with-accuracy")
async def translate_accuracy(request: Request):
    # For brevity, implementing a proxy wrapper or simplified version, but keeping API contract
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang") or data.get("dest")
    api_key = data.get("apiKey") or os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
         raise HTTPException(status_code=400, detail="GEMINI_API_KEY is not configured.")
         
    # Call standard translation logic first
    translation_payload = {
        "system_instruction": {
            "parts": [{"text": f"You are an expert legal translator. Translate the provided text into {target_lang}. Maintain all HTML tags, structure, CSS styles, and FreeMarker template variables like ${{...}} and <#if ...> exactly as they are without translating them. CRITICAL RULE: If a legal term, Act name, Section, Bank Name, or complex sentence is difficult to understand naturally when translated into {target_lang}, you MUST keep that specific part in its original English. Ensure very high accuracy of legal terminology."}]
        },
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {"temperature": 0.1},
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    resp = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}", json=translation_payload)
                    resp_data = resp.json()
                    
                    if "error" in resp_data:
                        raise Exception(resp_data["error"]["message"])
                        
                    if not resp_data.get("candidates") or not resp_data["candidates"][0].get("content"):
                        curr_error = "Safety filter blocked response"
                        if attempt == max_retries - 1:
                            return {"translated_text": text, "accuracy": 0, "reason": "Failed to translate due to AI safety filter."}
                        await asyncio.sleep(2 ** attempt)
                        continue

                    translated_text = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    translated_text = re.sub(r'^```html\s*', '', translated_text, flags=re.IGNORECASE).replace("```", "").strip()
                    
                    # Phase 2: Back-translation and Scoring Phase
                    eval_payload = {
                        "system_instruction": {"parts": [{"text": "You are a legal review assistant. You will be provided with an ORIGINAL ENGLISH text and a FOREIGN TRANSLATION of that text. 1. Translate the foreign text back to English. 2. Compare your back-translation with the original English text. 3. Rate the semantic accuracy of the foreign translation on a scale of 0 to 100. 4. Briefly explain the reason. Output MUST be ONLY valid JSON matching exactly this format: {\"accuracy\": 95, \"reason\": \"Meaning is fully preserved, slight differences in phrasing.\"}"}]},
                        "contents": [{"parts": [{"text": f"ORIGINAL ENGLISH TEXT:\n{text}\n\nFOREIGN TRANSLATION DELIVERED:\n{translated_text}"}]}],
                        "generationConfig": {"temperature": 0.1},
                        "safetySettings": [
                            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                        ]
                    }
                    
                    accuracy = 100
                    reason = "Verified by Python backend migration"
                    
                    try:
                        eval_resp = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}", json=eval_payload)
                        eval_data = eval_resp.json()
                        if "candidates" in eval_data and eval_data["candidates"]:
                            eval_text = eval_data["candidates"][0]["content"]["parts"][0]["text"]
                            eval_text = re.sub(r'^```json\s*', '', eval_text, flags=re.IGNORECASE)
                            eval_text = re.sub(r'^```\s*', '', eval_text)
                            eval_text = re.sub(r'```$', '', eval_text).strip()
                            import json as j
                            eval_json = j.loads(eval_text)
                            accuracy = int(eval_json.get("accuracy", 100))
                            reason = str(eval_json.get("reason", "Verified by AI back-translation"))
                    except Exception as eval_err:
                        print(f"Failed to parse accuracy evaluation: {eval_err}")

                    return {"translated_text": translated_text, "accuracy": accuracy, "reason": reason}
                except Exception as e:
                    err_str = str(e).lower()
                    if attempt == max_retries - 1:
                        if "high demand" in err_str or "quota" in err_str or "429" in err_str or "503" in err_str or "unavailable" in err_str:
                            print(f"Gemini limit reached. Falling back to GoogleTranslator. Error: {e}")
                            try:
                                target = target_lang.lower().strip()
                                translator = GoogleTranslator(source='auto', target=target)
                                back_translator = GoogleTranslator(source=target, target='en')
                                
                                tokens = []
                                def repl(match):
                                    tokens.append(match.group(0))
                                    return f" ZZZZ{len(tokens)-1}ZZZZ "
                                plain_text = re.sub(r'(<[^>]+>|\$\{[^}]+\})', repl, text)
                                
                                chunks, curr = [], ""
                                for part in plain_text.split('\n'):
                                    if len(curr) + len(part) > 4500:
                                        if curr: chunks.append(curr)
                                        curr = part + '\n'
                                    else:
                                        curr += part + '\n'
                                if curr: chunks.append(curr)
                                
                                fallback_parts = []
                                back_parts = []
                                for c in chunks:
                                    if c.strip():
                                        trans = translator.translate(c)
                                        fallback_parts.append(trans)
                                        try:
                                            back_parts.append(back_translator.translate(trans))
                                        except Exception:
                                            pass
                                
                                translated_plain = "".join(fallback_parts)
                                back_plain = "".join(back_parts)
                                
                                def restore(match):
                                    idx = int(match.group(1))
                                    return tokens[idx] if idx < len(tokens) else match.group(0)
                                    
                                fallback_translation = re.sub(r'ZZZZ\s*(\d+)\s*ZZZZ', restore, translated_plain, flags=re.IGNORECASE)
                                back_translated_text = re.sub(r'ZZZZ\s*(\d+)\s*ZZZZ', restore, back_plain, flags=re.IGNORECASE)
                                
                                import difflib
                                similarity = difflib.SequenceMatcher(None, text, back_translated_text).ratio()
                                accuracy = int(similarity * 100)
                                
                                return {"translated_text": fallback_translation, "accuracy": accuracy, "reason": "Calculated via Google Back-Translation"}
                            except Exception as fallback_e:
                                print(f"Fallback translation failed: {fallback_e}")
                                raise e
                        raise e
                    if "high demand" in err_str or "quota" in err_str or "429" in err_str or "503" in err_str or "unavailable" in err_str:
                        await asyncio.sleep(2 ** attempt)
                    else:
                        raise e
        except Exception as e:
            print(f"Translate with accuracy API error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
@app.post("/functions/v1/server/api/generate")
async def generate_openai(request: Request):
    data = await request.json()
    prompt = data.get("prompt")
    context = data.get("context")
    api_key = data.get("apiKey") or os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key not configured")
        
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post('https://api.openai.com/v1/chat/completions', headers={
                "Authorization": f"Bearer {api_key}"
            }, json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are an expert legal assistant specializing in drafting Indian legal notices. Output professional, legally precise HTML."},
                    {"role": "user", "content": f"Context: {json.dumps(context)}\n\nTask: {prompt}"}
                ]
            })
            resp_data = resp.json()
            if "error" in resp_data:
                raise Exception(resp_data["error"]["message"])
            
            result = resp_data["choices"][0]["message"]["content"]
            result = re.sub(r'^```html\s*', '', result).replace("```", "").strip()
            return {"result": result}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
