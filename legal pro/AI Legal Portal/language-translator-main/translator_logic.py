from googletrans import Translator
import re

class TranslatorCore:
    def __init__(self):
        self.translator = Translator()

    def translate_text(self, text, dest):
        if not text:
            return ""
        
        # Identify and protect placeholders ${ } and [[ ]]
        placeholders = re.findall(r'(\$\{.*?\}|\[\[.*?\]\])', text)
        tokenized_text = text
        for i, placeholder in enumerate(placeholders):
            tokenized_text = tokenized_text.replace(placeholder, f" _P{i}_ ", 1)

        translated_obj = self.translator.translate(tokenized_text, dest=dest)
        translated_text = translated_obj.text
        
        # Restore placeholders
        for i, placeholder in enumerate(placeholders):
            translated_text = translated_text.replace(f"_P{i}_", placeholder).replace(f"_p{i}_", placeholder)
        
        return translated_text

    def get_supported_languages(self):
        from googletrans import LANGUAGES
        requested = ['hi', 'ta', 'te', 'kn', 'mr', 'gu', 'bn', 'ml', 'as', 'or', 'en']
        return {code: LANGUAGES[code] for code in requested if code in LANGUAGES}

