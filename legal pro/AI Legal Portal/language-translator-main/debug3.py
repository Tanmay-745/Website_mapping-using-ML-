from translator_logic import TranslatorCore

core = TranslatorCore()

text = "Reference: LDN/ ${sno} /03-26"
print("Translating:", text)
res = core.translate_text(text, "hi")
with open("debug_out3.txt", "w", encoding="utf-8") as f:
    f.write(res)
print("Output written to debug_out3.txt")
