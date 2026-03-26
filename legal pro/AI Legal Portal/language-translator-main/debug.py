import re

text = """<h1 style="background-color: transparent; font-size: 14px;">what is thid</h1>
<p>Hello, ${borrower_name}</p>"""

placeholders = re.findall(r'(\$\{.*?\}|\[\[.*?\]\]|<[^>]+>)', text)
print(f"Tokens: {placeholders}")

tokenized_text = text
for i, placeholder in enumerate(placeholders):
    tokenized_text = tokenized_text.replace(placeholder, f" _T{i}_ ", 1)
    
print(f"Tokenized: {tokenized_text}")
