from translator_logic import TranslatorCore

core = TranslatorCore()

paragraph = "<p>This is a repeating paragraph to make the text very long. We need to exceed five thousand characters to see how the translation API behaves. The user reported that long formal letters get truncated during translation. This could be due to a hard limit in the python googletrans library or the Google Translate API itself.</p>\n"
longText = '<h1 style="text-align: center;">LEGAL RECOVERY NOTICE</h1>\n' + (paragraph * 100) + '<p>End of notice.</p>'

print(f"Original length: {len(longText)}")

try:
    translatedText = core.translate_text(longText, "hi")
    print(f"Translated length: {len(translatedText)}")
    print(f"Preview start: {translatedText[:100]}")
    print(f"Preview end: {translatedText[-200:]}")
except Exception as e:
    print(f"Translation failed: {e}")
