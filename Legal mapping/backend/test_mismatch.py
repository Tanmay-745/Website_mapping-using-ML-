import json
import csv

# We want to mimic getExportData() in useCSVMapping.ts
data = [
    {"source1": "a", "source2": "b", "source3": "c"},
    {"source1": "d", "source2": "", "source3": "f"},
    {"source1": "", "source2": "h", "source3": "i"}
]

mappings = [
    {"sourceHeader": "source1", "targetHeader": "Target A"},
    {"sourceHeader": "source2", "targetHeader": None}, # Skipped
    {"sourceHeader": "source3", "targetHeader": "Target B"}
]

active_mappings = [m for m in mappings if m["targetHeader"] is not None]

mapped_rows = []
for row in data:
    new_row = {}
    for mapping in active_mappings:
        target = mapping["targetHeader"]
        source = mapping["sourceHeader"]
        new_row[target] = row.get(source, '')
    mapped_rows.append(new_row)

print(json.dumps(mapped_rows, indent=2))

# Also mimic export logic in App.tsx
headers = [m["targetHeader"] for m in active_mappings]
print("Export Headers:", headers)

for row in mapped_rows:
    print([row.get(h, '') for h in headers])
