from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import warnings

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


@app.get("/")
def read_root():
    return {"status": "Legal Mapping ML API is running"}


@app.post("/api/map-columns")
async def map_columns(file: UploadFile = File(...)):
    """
    Receives an Excel or CSV file from the frontend and returns the recommended column mappings.
    """
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file, nrows=0) # Read only headers
        elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(file.file, nrows=0)
        else:
            return {"error": "Unsupported file format. Please upload CSV or Excel."}
            
        messy_columns = df.columns.tolist()
        mappings = []
        
        for col in messy_columns:
            sem_col, sem_conf = semantic_match_column(col)
            
            mappings.append({
                "source_column": col,
                "predicted_target": sem_col,
                "confidence_score": round(sem_conf, 2)
            })
            
        return {"filename": file.filename, "mappings": mappings}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
