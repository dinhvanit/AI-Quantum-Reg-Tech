from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.domain.contracts import PrivateDocumentExtractRequest

router = APIRouter(tags=["private-documents"])


@router.post("/api/v1/private/extract")
async def extract_private_document(body: PrivateDocumentExtractRequest) -> dict:
    total = sum(len(item.text) for item in body.lines)
    if total > 180_000:
        raise HTTPException(status_code=413, detail="Văn bản gửi AI vượt giới hạn 180.000 ký tự.")
    from app.agents.document_graph import extract_document

    return await extract_document([item.model_dump() for item in body.lines])
