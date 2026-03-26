from translator_logic import TranslatorCore

core = TranslatorCore()

text = '<h1 style="background-color: transparent;">what is thid</h1> <#if address?has_content> Hello ${borrower_name}</p>'
print("Translating:", text)
res = core.translate_text(text, "hi")
with open("debug_out.txt", "w", encoding="utf-8") as f:
    f.write(res)
print("Output written to debug_out.txt")
