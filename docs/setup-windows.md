# Local setup on Windows

Goal: the pipeline and later the demo run on the presenter's laptop. Takes about 20 minutes.
Commands are for PowerShell.

## 1. Tools

```powershell
winget install -e --id Git.Git
winget install -e --id Python.Python.3.12
winget install -e --id OpenJS.NodeJS.LTS          # for the frontend (step 5)
winget install -e --id UB-Mannheim.TesseractOCR   # OCR engine
winget install -e --id Microsoft.VisualStudioCode
```

Open a **new** PowerShell window afterwards so PATH is updated. In VS Code install the
extensions "Python" and "Claude Code".

**German OCR data:** run `tesseract --list-langs`. A silent winget install brings only `eng`
and `osd`. Download `deu.traineddata` from the official repository
github.com/tesseract-ocr/tessdata_fast and either

- copy it to `C:\Program Files\Tesseract-OCR\tessdata` (administrator PowerShell), or
- without admin rights (what the demo laptop uses): create
  `%LOCALAPPDATA%\Tesseract-OCR\tessdata`, copy `eng.traineddata` and `osd.traineddata` from
  the install folder plus the downloaded `deu.traineddata` into it, and set `TESSDATA_PREFIX`
  to that folder in `.env` (step 3).

The pipeline refuses to start without it (without German data Tesseract silently reads
"Händler" as "Handler"). Note: OCR output can differ slightly between machines (failure case
F9), so run the evaluation on the demo laptop itself.

## 2. Code

```powershell
cd C:\Users\Dima\Documents\Riverty
git clone https://github.com/Dima008/riverty-legal-ai.git
cd riverty-legal-ai
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements.txt
git config core.hooksPath .githooks    # secret guard before every commit
code .
```

## 3. Configuration

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in endpoint, key and deployment names from the Azure portal (Azure OpenAI resource →
Keys and Endpoint; deployments: `gpt-4.1-mini`, `text-embedding-3-small`). `.env` is
git-ignored; never commit it. Uncomment `TESSERACT_CMD` only if Tesseract is not found, and
`TESSDATA_PREFIX` if the language data lives in your user folder (see above). Save the file as
UTF-8 without BOM (Notepad and VS Code do this by default; PowerShell 5.1 `Set-Content` does not).

## 4. Check

```powershell
tesseract --list-langs                                   # must list deu and eng
python -c "import sqlite3; sqlite3.connect(':memory:').execute('create virtual table t using fts5(x)'); print('fts5 ok')"
python -m pipeline.run                                   # ~3 min, ~$0.12
python -m eval.check_register                            # expect: recall 1.0 on Q1-Q8
```

Then try the inbox: run `python -m pipeline.run --watch`, copy any PDF from `data\raw\merchant`
into `data\inbox` under a new name and watch it appear as a duplicate in the register.
