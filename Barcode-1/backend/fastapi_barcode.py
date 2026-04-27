import os
import json
import time
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE_PATH = os.path.join(BASE_DIR, '../data/barcodes.json')

# Create necessary directories if they don't exist
os.makedirs(os.path.dirname(DATA_FILE_PATH), exist_ok=True)
if not os.path.exists(DATA_FILE_PATH):
    with open(DATA_FILE_PATH, 'w') as f:
        json.dump([], f)

async def get_barcodes(retries=3):
    try:
        if not os.path.exists(DATA_FILE_PATH):
            return []
        
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            data = f.read().strip()
            if not data:
                return []
            return json.loads(data)
            
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error in barcodes.json: {e}")
        if retries > 0:
            print(f"Retrying read... ({retries} attempts left)")
            await asyncio.sleep(0.1)
            return await get_barcodes(retries - 1)
        raise Exception("Failed to parse barcodes.json after multiple attempts. Data might be corrupted.")
    except Exception as e:
        raise e

async def save_barcodes(barcodes):
    temp_file_path = f"{DATA_FILE_PATH}.tmp"
    with open(temp_file_path, 'w', encoding='utf-8') as f:
        json.dump(barcodes, f, indent=2)
    os.replace(temp_file_path, DATA_FILE_PATH)

def get_js_date():
    return datetime.now().strftime("%m/%d/%Y")

def get_js_timestamp():
    return int(time.time() * 1000)

@app.get("/api/barcodes")
async def read_barcodes(status: str = Query(None), count: int = Query(None)):
    try:
        barcodes = await get_barcodes()
        
        if status == 'available':
            barcodes = [b for b in barcodes if not b.get('isUsed')]
            
        if count is not None:
            barcodes = barcodes[:count]
            
        return barcodes
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/barcodes")
async def write_barcodes(request: Request):
    try:
        body = await request.json()
        action = body.get('action')
        barcode_id = str(body.get('barcodeId', ''))
        lender_name = body.get('lenderName')
        new_barcodes = body.get('newBarcodes')
        target_lender = body.get('targetLender')
        
        barcodes = await get_barcodes()
        
        if action == 'markUsed':
            if 'updates' in body:
                updates = body['updates']
                updates_map = {str(u['id']): u for u in updates}
                for b in barcodes:
                    update = updates_map.get(str(b['id']))
                    if update:
                        b['isUsed'] = True
                        b['lenderName'] = update.get('lenderName')
                        b['bankName'] = update.get('bankName')
                        b['lan'] = update.get('lan', "")
                        b['usedAt'] = get_js_date()
            else:
                for b in barcodes:
                    if str(b['id']) == barcode_id:
                        b['isUsed'] = True
                        b['lenderName'] = lender_name
                        b['bankName'] = body.get('bankName')
                        b['lan'] = body.get('lan', "")
                        b['usedAt'] = get_js_date()
                        
        elif action == 'reset':
            for b in barcodes:
                if str(b['id']) == barcode_id:
                    b['resetAt'] = get_js_timestamp()
                    
        elif action == 'cancelReset':
            for b in barcodes:
                if str(b['id']) == barcode_id:
                    b.pop('resetAt', None)
                    
        elif action == 'completeReset':
            for b in barcodes:
                if str(b['id']) == barcode_id:
                    b['isUsed'] = False
                    b['lenderName'] = ''
                    b['bankName'] = None
                    b['lan'] = ''
                    b.pop('usedAt', None)
                    b.pop('resetAt', None)
                    
        elif action == 'editLenderName':
            old_lender_name = body.get('oldLenderName')
            new_lender_name = body.get('newLenderName')
            if old_lender_name and new_lender_name:
                for b in barcodes:
                    b_lender = b.get('bankName')
                    if not b_lender or b_lender.strip() == "":
                        b_lender = "Unknown Lender"
                    if b.get('isUsed') and b_lender == old_lender_name:
                        b['bankName'] = new_lender_name
                        
        elif action == 'resetByLender':
            if target_lender:
                for b in barcodes:
                    b_lender = b.get('bankName')
                    is_match = False
                    if target_lender == "Unknown Lender":
                        is_match = not b_lender or b_lender.strip() == ""
                    else:
                        is_match = b_lender == target_lender
                        
                    if is_match and b.get('isUsed'):
                        b['isUsed'] = False
                        b['lenderName'] = ''
                        b['bankName'] = None
                        b['lan'] = ''
                        b.pop('usedAt', None)
                        b.pop('resetAt', None)
                        
        elif action == 'add' and new_barcodes:
            existing_codes = set(b.get('code') for b in barcodes)
            try:
                next_id = max((int(b['id']) for b in barcodes if b.get('id', '').isdigit()), default=0) + 1
            except ValueError:
                next_id = 1
                
            for nb in new_barcodes:
                if nb.get('code') not in existing_codes:
                    barcodes.append({
                        'id': str(next_id),
                        'code': nb.get('code'),
                        'lenderName': nb.get('lenderName', ""),
                        'bankName': nb.get('bankName', ""),
                        'lan': nb.get('lan', ""),
                        'createdAt': nb.get('createdAt') or get_js_date(),
                        'isUsed': nb.get('isUsed', False)
                    })
                    existing_codes.add(nb.get('code'))
                    next_id += 1

        await save_barcodes(barcodes)
        return {"success": True, "barcodes": barcodes}
        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3005)
