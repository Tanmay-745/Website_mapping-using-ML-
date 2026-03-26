from googletrans import Translator
import re

class TranslatorCore:
    def __init__(self):
        self.translator = Translator()

    def translate_text(self, text, dest):
        if not text:
            return ""

        # Chunk the text to avoid 5000 character limits or silent drops on googletrans
        max_chunk_size = 3000
        # Split by block tags or newlines to help keep HTML structure intact
        parts = re.split(r'(</p>|</ul>|</h3>|</h1>|</h2>|</h4>|<hr/>|<br/>|\n)', text, flags=re.IGNORECASE)
        
        chunks = []
        current_chunk = ""
        for part in parts:
            if len(current_chunk) + len(part) < max_chunk_size:
                current_chunk += part
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = part
        if current_chunk:
            chunks.append(current_chunk)

        translated_text = ""
        for chunk in chunks:
            if chunk.strip():
                try:
                    # Identify placeholders AND HTML tags
                    placeholders = re.findall(r'(\$\{.*?\}|\[\[.*?\]\]|<[^>]+>)', chunk)
                    tokenized_chunk = chunk
                    for i, placeholder in enumerate(placeholders):
                        tokenized_chunk = tokenized_chunk.replace(placeholder, f" _T{i}_ ", 1)

                    translated_obj = self.translator.translate(tokenized_chunk, dest=dest)
                    translated_chunk = translated_obj.text
                    
                    # Restore placeholders and HTML tags
                    for i, placeholder in enumerate(placeholders):
                        # Handle varied translation spaces
                        translated_chunk = translated_chunk.replace(f"_T{i}_", placeholder)
                        translated_chunk = translated_chunk.replace(f"_t{i}_", placeholder)
                        translated_chunk = translated_chunk.replace(f"_ T{i} _", placeholder)
                        translated_chunk = translated_chunk.replace(f"_ t{i} _", placeholder)
                    
                    translated_text += translated_chunk
                except Exception as e:
                    print(f"Translation chunk failed: {e}")
                    translated_text += chunk
            else:
                translated_text += chunk
        
        return translated_text

    def get_supported_languages(self):
        from googletrans import LANGUAGES
        requested = ['hi', 'ta', 'te', 'kn', 'mr', 'gu', 'bn', 'ml', 'as', 'or', 'en']
        return {code: LANGUAGES[code] for code in requested if code in LANGUAGES}

