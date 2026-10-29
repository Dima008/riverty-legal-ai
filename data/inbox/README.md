# Inbox (stand-in for the SharePoint contract library)

Drop a PDF, JPEG/PNG scan (multi-page: `name_p1.jpg`, `name_p2.jpg`) or TXT file here while
`python -m pipeline.run --watch` is running. The pipeline picks it up within seconds:
ingest, OCR if needed, chunking, extraction into the register, families, index.

In production a Microsoft Graph connector (delta query / change notifications) on the
SharePoint library replaces this folder; everything after ingestion stays the same.
