# Python Excel Translation Service

A FastAPI service that translates Excel files while preserving all formatting, images, charts, and tables using `openpyxl`.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variable:
```bash
# Create .env file
echo "GEMINI_API_KEY=your_key_here" > .env
```

4. Run the server:
```bash
python main.py
# or
uvicorn main:app --reload --port 8000
```

## API Endpoints

### POST /translate-excel
Upload an Excel file for translation.

**Form Data:**
- `file`: Excel file (.xlsx or .xls)
- `prompt`: Translation instructions (optional)
- `model`: Gemini model to use (optional, default: gemini-2.0-flash)

**Response:**
- Translated Excel file as download

### GET /health
Health check endpoint.

## Deployment

Deploy to Render:
1. Create new Web Service
2. Choose Python environment
3. Set `GEMINI_API_KEY` environment variable
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
