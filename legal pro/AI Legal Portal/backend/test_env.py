import os, re
BASE_DIR = r'd:\legal v1\Website_mapping-using-ML-\legal pro\AI Legal Portal\backend'
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

print("Key in os.environ:", os.environ.get("GEMINI_API_KEY"))
