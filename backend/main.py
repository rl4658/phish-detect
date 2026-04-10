"""
PhishDetect — Forensic Email Analysis API

Endpoints:
    POST /analyze     Upload .csv or .eml for phishing analysis
    GET  /status/{id} Poll for analysis results
    GET  /health      Health check
"""

import os
import sys
import uuid
import time
import traceback
from io import BytesIO, StringIO
from typing import Optional

import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.preprocessor import (
    extract_features_from_row,
    extract_features_dataframe,
    FEATURE_COLUMNS,
)

# ── App Setup ─────────────────────────────────────────────────
app = FastAPI(
    title="PhishDetect API",
    description="AI-powered forensic email phishing detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Model ────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
model = None
scaler = None


def load_model():
    global model, scaler
    model_path = os.path.join(MODELS_DIR, "phishing_model.pkl")
    scaler_path = os.path.join(MODELS_DIR, "preprocessor.pkl")
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        print(f"[OK] Model loaded from {model_path}")
    else:
        print(f"[!] Model files not found in {MODELS_DIR}. Run train.py first.")


@app.on_event("startup")
async def startup_event():
    load_model()


# ── In-Memory Task Store ─────────────────────────────────────
tasks: dict = {}


class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending | processing | completed | error
    progress: float  # 0.0 to 1.0
    total_emails: int
    processed_emails: int
    results: Optional[list] = None
    summary: Optional[dict] = None
    error: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "timestamp": time.time(),
    }


@app.post("/analyze")
async def analyze(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")

    # Validate file type
    filename = file.filename or ""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ("csv", "eml"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Upload .csv or .eml files.",
        )

    # Read file content
    content = await file.read()
    task_id = str(uuid.uuid4())

    # Initialize task
    tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "progress": 0.0,
        "total_emails": 0,
        "processed_emails": 0,
        "results": None,
        "summary": None,
        "error": None,
        "file_name": filename,
        "file_type": ext,
    }

    # Dispatch background processing
    if ext == "csv":
        background_tasks.add_task(process_csv, task_id, content)
    else:
        background_tasks.add_task(process_eml, task_id, content)

    return {"task_id": task_id, "status": "pending"}


@app.get("/status/{task_id}")
async def get_status(task_id: str):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]


# ── Background Processing ────────────────────────────────────
def predict_single(features_dict: dict) -> dict:
    """Run inference on a single email's features."""
    feature_values = np.array([[features_dict[col] for col in FEATURE_COLUMNS]])
    scaled = scaler.transform(feature_values)
    prediction = model.predict(scaled)[0]
    probabilities = model.predict_proba(scaled)[0]
    return {
        "prediction": "Phishing" if prediction == 1 else "Legit",
        "confidence": float(max(probabilities)),
        "phishing_probability": float(probabilities[1]) if len(probabilities) > 1 else float(prediction),
        "legit_probability": float(probabilities[0]) if len(probabilities) > 1 else float(1 - prediction),
    }


def process_csv(task_id: str, content: bytes):
    """Process an uploaded CSV file with batch inference."""
    try:
        tasks[task_id]["status"] = "processing"

        # Read CSV
        csv_text = content.decode("utf-8", errors="replace")
        df = pd.read_csv(StringIO(csv_text), low_memory=False)
        total = len(df)
        tasks[task_id]["total_emails"] = total

        if total == 0:
            tasks[task_id]["status"] = "error"
            tasks[task_id]["error"] = "CSV file is empty"
            return

        # Check required columns
        required = ["spf_result", "dkim_result", "dmarc_result", "num_urls", "from_domain"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            tasks[task_id]["status"] = "error"
            tasks[task_id]["error"] = f"Missing columns: {', '.join(missing)}"
            return

        # Fill missing optional columns
        optional_defaults = {
            "has_attachments": False,
            "contains_tracking_token": False,
            "reply_to": "",
            "num_received_headers": 0,
            "x_spam_score": 0.0,
            "has_html": False,
        }
        for col, default in optional_defaults.items():
            if col not in df.columns:
                df[col] = default

        # Batch feature extraction
        features_df = extract_features_dataframe(df)
        scaled_features = scaler.transform(features_df)

        # Batch prediction
        predictions = model.predict(scaled_features)
        probabilities = model.predict_proba(scaled_features)

        # Build results
        results = []
        for i in range(total):
            row = df.iloc[i]
            result = {
                "index": i,
                "subject": str(row.get("subject", "N/A")) if "subject" in df.columns else "N/A",
                "from_address": str(row.get("from_address", "N/A")) if "from_address" in df.columns else "N/A",
                "from_domain": str(row.get("from_domain", "")),
                "reply_to": str(row.get("reply_to", "")),
                "prediction": "Phishing" if predictions[i] == 1 else "Legit",
                "confidence": float(max(probabilities[i])),
                "phishing_probability": float(probabilities[i][1]),
                "legit_probability": float(probabilities[i][0]),
                "spf_result": str(row.get("spf_result", "none")),
                "dkim_result": str(row.get("dkim_result", "none")),
                "dmarc_result": str(row.get("dmarc_result", "none")),
                "num_urls": int(row.get("num_urls", 0)) if not pd.isna(row.get("num_urls", 0)) else 0,
                "has_attachments": bool(str(row.get("has_attachments", False)).strip().lower() in ("true", "1", "yes")),
                "contains_tracking_token": bool(str(row.get("contains_tracking_token", False)).strip().lower() in ("true", "1", "yes")),
                "received_origin_ip": str(row.get("received_origin_ip", "N/A")) if "received_origin_ip" in df.columns else "N/A",
                "num_received_headers": int(row.get("num_received_headers", 0)) if not pd.isna(row.get("num_received_headers", 0)) else 0,
                "x_spam_score": float(row.get("x_spam_score", 0.0)) if not pd.isna(row.get("x_spam_score", 0.0)) else 0.0,
            }
            results.append(result)

            # Update progress every 500 rows
            if i % 500 == 0:
                tasks[task_id]["processed_emails"] = i + 1
                tasks[task_id]["progress"] = (i + 1) / total

        # Summary statistics
        phishing_count = int(sum(1 for r in results if r["prediction"] == "Phishing"))
        legit_count = total - phishing_count
        avg_confidence = float(np.mean([r["confidence"] for r in results]))

        tasks[task_id].update({
            "status": "completed",
            "progress": 1.0,
            "processed_emails": total,
            "results": results,
            "summary": {
                "total_emails": total,
                "phishing_count": phishing_count,
                "legit_count": legit_count,
                "phishing_percentage": round(phishing_count / total * 100, 2),
                "average_confidence": round(avg_confidence * 100, 2),
            },
        })

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"] = str(e)
        traceback.print_exc()


def process_eml(task_id: str, content: bytes):
    """Process an uploaded .eml file."""
    try:
        tasks[task_id]["status"] = "processing"
        tasks[task_id]["total_emails"] = 1

        import mailparser

        mail = mailparser.parse_from_bytes(content)

        # Extract authentication results from headers
        auth_results = {}
        headers_dict = {k.lower(): v for k, v in mail.headers.items()} if mail.headers else {}

        # Parse Authentication-Results header
        auth_header = headers_dict.get("authentication-results", "")
        if isinstance(auth_header, list):
            auth_header = " ".join(auth_header)
        auth_header_lower = auth_header.lower()

        # Extract SPF
        spf_result = "none"
        if "spf=pass" in auth_header_lower:
            spf_result = "pass"
        elif "spf=fail" in auth_header_lower or "spf=softfail" in auth_header_lower:
            spf_result = "fail"
        elif "spf=neutral" in auth_header_lower:
            spf_result = "neutral"

        # Extract DKIM
        dkim_result = "none"
        if "dkim=pass" in auth_header_lower:
            dkim_result = "pass"
        elif "dkim=fail" in auth_header_lower:
            dkim_result = "fail"
        elif "dkim=neutral" in auth_header_lower:
            dkim_result = "neutral"

        # Extract DMARC
        dmarc_result = "none"
        if "dmarc=pass" in auth_header_lower:
            dmarc_result = "pass"
        elif "dmarc=fail" in auth_header_lower:
            dmarc_result = "fail"
        elif "dmarc=neutral" in auth_header_lower:
            dmarc_result = "neutral"

        # Extract from_domain
        from_addr = mail.from_[0][1] if mail.from_ else ""
        from_domain = from_addr.split("@")[-1] if "@" in from_addr else ""

        # Extract reply_to
        reply_to = ""
        if mail.reply_to:
            reply_to = mail.reply_to[0][1] if isinstance(mail.reply_to[0], tuple) else str(mail.reply_to[0])

        # Count URLs in body
        import re
        body_text = mail.body or ""
        urls = re.findall(r'https?://[^\s<>"]+', body_text)
        num_urls = len(urls)

        # Count received headers
        received_headers = headers_dict.get("received", [])
        if isinstance(received_headers, str):
            received_headers = [received_headers]
        num_received = len(received_headers)

        # Extract origin IP from first (oldest) Received header
        origin_ip = "Unknown"
        if received_headers:
            last_received = received_headers[-1] if isinstance(received_headers, list) else received_headers
            ip_match = re.search(r'\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?', str(last_received))
            if ip_match:
                origin_ip = ip_match.group(1)

        # Build feature row
        email_data = {
            "spf_result": spf_result,
            "dkim_result": dkim_result,
            "dmarc_result": dmarc_result,
            "num_urls": num_urls,
            "has_attachments": len(mail.attachments) > 0 if mail.attachments else False,
            "contains_tracking_token": False,  # Hard to detect in raw EML
            "from_domain": from_domain,
            "reply_to": reply_to,
            "num_received_headers": num_received,
            "x_spam_score": 0.0,  # Not always in EML headers
            "has_html": bool(mail.text_html),
        }

        # Check for X-Spam-Score header
        x_spam = headers_dict.get("x-spam-score", "0")
        try:
            email_data["x_spam_score"] = float(x_spam)
        except (ValueError, TypeError):
            email_data["x_spam_score"] = 0.0

        # Predict
        features = extract_features_from_row(email_data)
        prediction = predict_single(features)

        result = {
            "index": 0,
            "subject": mail.subject or "N/A",
            "from_address": from_addr,
            "from_domain": from_domain,
            "reply_to": reply_to,
            "to_addresses": ", ".join([addr[1] for addr in mail.to]) if mail.to else "N/A",
            "date": str(mail.date) if mail.date else "N/A",
            **prediction,
            "spf_result": spf_result,
            "dkim_result": dkim_result,
            "dmarc_result": dmarc_result,
            "num_urls": num_urls,
            "has_attachments": len(mail.attachments) > 0 if mail.attachments else False,
            "contains_tracking_token": False,
            "received_origin_ip": origin_ip,
            "num_received_headers": num_received,
            "x_spam_score": email_data["x_spam_score"],
            "received_hops": [str(h) for h in (received_headers if isinstance(received_headers, list) else [received_headers])],
        }

        tasks[task_id].update({
            "status": "completed",
            "progress": 1.0,
            "processed_emails": 1,
            "results": [result],
            "summary": {
                "total_emails": 1,
                "phishing_count": 1 if prediction["prediction"] == "Phishing" else 0,
                "legit_count": 1 if prediction["prediction"] == "Legit" else 0,
                "phishing_percentage": 100.0 if prediction["prediction"] == "Phishing" else 0.0,
                "average_confidence": round(prediction["confidence"] * 100, 2),
            },
        })

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"] = str(e)
        traceback.print_exc()
