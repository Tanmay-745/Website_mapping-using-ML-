import requests
import json

def test_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    print("Testing /languages endpoint...")
    try:
        resp = requests.get(f"{base_url}/languages")
        if resp.status_code == 200:
            langs = resp.json()
            print(f"✅ Success! Found {len(langs)} languages.")
            # Verify a few common ones
            if 'en' in langs and 'es' in langs:
                 print("✅ Standard languages (en, es) present.")
        else:
            print(f"❌ Failed /languages with status {resp.status_code}")
    except Exception as e:
        print(f"❌ Error testing /languages: {e}")

    print("\nTesting /translate endpoint...")
    payload = {
        "text": "Hello world {name}",
        "dest": "es"
    }
    try:
        resp = requests.post(f"{base_url}/translate", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            translated = data.get("translatedText", "")
            print(f"✅ Success! Translation: {translated}")
            if "{name}" in translated:
                print("✅ Placeholder protection working.")
            else:
                print("❌ Placeholder protection failed or name translated.")
        else:
            print(f"❌ Failed /translate with status {resp.status_code}")
    except Exception as e:
        print(f"❌ Error testing /translate: {e}")

if __name__ == "__main__":
    test_endpoints()
