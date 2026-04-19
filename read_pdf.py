import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import fitz
doc = fitz.open("Innov8-PS.pdf")
for i, page in enumerate(doc):
    print(f"=== PAGE {i+1} ===")
    print(page.get_text())
