import asyncio
import json
import re
from pathlib import Path

import pdfplumber

from app.config import ANTHROPIC_MODEL, BASE_DIR

MIN_TEXT_CHARS_FOR_TEXT_MODE = 60
CLI_TIMEOUT_SECONDS = 120

SCHEMA_INSTRUCTIONS = """Output ONLY a single JSON object with exactly these keys, and nothing else
(no markdown code fences, no commentary before or after it):

{
  "vendor_name": string or null,
  "invoice_number": string or null,
  "invoice_date": string or null,
  "currency": string or null,
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "po_reference": string or null,
  "line_items": [ { "description": string, "quantity": number or null, "unit_price": number or null, "amount": number or null } ],
  "missing_or_unclear_fields": [string, ...],
  "extraction_notes": string
}

invoice_date should be ISO yyyy-mm-dd if determinable, otherwise exactly as printed.
currency should be an ISO code (e.g. USD) if determinable.
po_reference is any PO number explicitly printed on the invoice itself (not one you look up).
Never invent a value that isn't present or clearly inferable (e.g. total = subtotal + tax when both
are shown). If a field is missing, illegible, or ambiguous, use null for it and list its name in
missing_or_unclear_fields. extraction_notes is one sentence on anything unusual about the document.
"""


def _extract_text(pdf_path: Path) -> str:
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts).strip()


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    return match.group(1) if match else text


async def _run_claude_cli(prompt: str, cwd: Path) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt,
            "--output-format", "json",
            "--allowedTools", "Read",
            "--model", ANTHROPIC_MODEL,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "The 'claude' CLI was not found on PATH. Install Claude Code and make sure you're "
            "logged in (run `claude login`, or `claude setup-token` for headless auth)."
        ) from exc

    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=CLI_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        proc.kill()
        raise RuntimeError("claude CLI timed out while extracting this invoice.")

    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI exited {proc.returncode}: {stderr.decode(errors='replace')[:500]}")

    envelope = json.loads(stdout.decode())
    if envelope.get("is_error"):
        raise RuntimeError(f"claude CLI reported an error: {envelope.get('result')}")

    result_text = _strip_json_fences(envelope.get("result", ""))
    try:
        return json.loads(result_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Could not parse JSON from claude's reply: {result_text[:300]}") from exc


async def extract_invoice_fields(pdf_path: Path) -> dict:
    """
    Returns:
      {
        "method": "text" | "vision",
        "data": {...schema above...},
        "raw_text_preview": str,
        "confidence": float,
      }
    """
    raw_text = _extract_text(pdf_path)
    method = "text" if len(raw_text) >= MIN_TEXT_CHARS_FOR_TEXT_MODE else "vision"

    relative_path = pdf_path.resolve().relative_to(BASE_DIR)
    scan_hint = (
        "This document has no machine-readable text layer (it's a scanned image) "
        "so read it visually, page by page."
        if method == "vision"
        else "This document has a normal text layer."
    )
    prompt = (
        f"Use the Read tool to open the invoice PDF at '{relative_path}'. {scan_hint}\n"
        f"Then extract its fields.\n\n{SCHEMA_INSTRUCTIONS}"
    )

    data = await _run_claude_cli(prompt, cwd=BASE_DIR)

    missing = data.get("missing_or_unclear_fields") or []
    confidence = 0.97 - (0.12 * len(missing))
    if method == "vision":
        confidence = min(confidence, 0.78)  # OCR/vision reads always carry residual risk
    confidence = max(0.1, min(confidence, 0.99))

    return {
        "method": method,
        "data": data,
        "raw_text_preview": raw_text[:600] if method == "text"
        else "(scanned document, no embedded text layer; read via Claude's vision)",
        "confidence": round(confidence, 2),
    }
