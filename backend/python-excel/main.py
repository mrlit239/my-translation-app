"""
Excel Translation Service
Translates Excel files while preserving images, charts, and formatting using openpyxl
"""

import os
import io
import re
import tempfile
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openpyxl import load_workbook
from openpyxl.cell.cell import Cell
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Excel Translation Service")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def has_translatable_text(text: str) -> bool:
    """Check if text contains Japanese or Chinese characters"""
    if not text or not isinstance(text, str):
        return False
    # Japanese Hiragana, Katakana, Kanji, and Chinese characters
    pattern = r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]'
    return bool(re.search(pattern, text))


def extract_translatable_cells(wb) -> list:
    """Extract all cells with Japanese/Chinese text from workbook"""
    cells = []
    
    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str) and has_translatable_text(cell.value):
                    cells.append({
                        'sheet': sheet_name,
                        'coord': cell.coordinate,
                        'value': cell.value,
                        'cell': cell
                    })
    
    return cells


async def translate_batch(texts: list, prompt: str, model_name: str = "gemini-2.0-flash") -> dict:
    """Translate a batch of texts using Gemini"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    
    # Format texts with markers
    batch_text = "\n".join([f"【{i}】{text}" for i, text in enumerate(texts)])
    
    full_prompt = f"""{prompt}

EXCEL CELL TRANSLATION RULES:
- Each cell is marked with 【number】
- Translate each cell and KEEP the 【number】 markers
- Keep translations concise (spreadsheet cells)
- Preserve numbers, dates, file names
- Output format: 【0】translation【1】translation...

Text to translate:
{batch_text}"""
    
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(full_prompt)
        result_text = response.text
        
        # Parse translations
        pattern = r'【(\d+)】([^【]*)'
        matches = re.findall(pattern, result_text)
        
        translations = {}
        for idx, text in matches:
            translations[int(idx)] = text.strip()
        
        return translations
    except Exception as e:
        print(f"Translation error: {e}")
        return {}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "excel-translation"}


@app.post("/translate-excel")
async def translate_excel(
    file: UploadFile = File(...),
    prompt: str = Form(default="Translate the following Japanese/Chinese text to Vietnamese. Maintain professional tone."),
    model: str = Form(default="gemini-2.0-flash")
):
    """
    Upload an Excel file, translate text cells, return the translated file.
    Preserves all images, charts, formatting.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Please upload an Excel file (.xlsx or .xls)")
    
    try:
        # Read uploaded file
        content = await file.read()
        
        # Load workbook with openpyxl (preserves everything)
        wb = load_workbook(io.BytesIO(content))
        
        # Extract translatable cells
        cells = extract_translatable_cells(wb)
        
        if not cells:
            # No cells to translate, return original
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={file.filename.replace('.xlsx', '_translated.xlsx')}"}
            )
        
        # Batch translate (groups of 15 cells)
        batch_size = 15
        for i in range(0, len(cells), batch_size):
            batch = cells[i:i + batch_size]
            texts = [c['value'] for c in batch]
            
            translations = await translate_batch(texts, prompt, model)
            
            # Apply translations to cells
            for j, cell_info in enumerate(batch):
                if j in translations:
                    sheet = wb[cell_info['sheet']]
                    sheet[cell_info['coord']] = translations[j]
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Return translated file
        translated_filename = file.filename.replace('.xlsx', '_translated.xlsx').replace('.xls', '_translated.xls')
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={translated_filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
