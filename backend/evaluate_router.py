"""
PhishDetect — Model Evaluation Endpoint
Accepts a labeled CSV and returns accuracy metrics.
"""

import pandas as pd
from io import StringIO
from fastapi import APIRouter, UploadFile, File, HTTPException
from sklearn.metrics import (
    accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix
)

router = APIRouter()


@router.post("/evaluate")
async def evaluate(file: UploadFile = File(...)):
    # import here so models are guaranteed to be loaded
    from main import model, scaler, nlp_model, tfidf
    from preprocessor import extract_features_dataframe

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train.py first.")
    
    # rest of the function stays the same...

    # ── Parse CSV ─────────────────────────────────────────
    content = await file.read()
    try:
        df = pd.read_csv(StringIO(content.decode("utf-8", errors="replace")), low_memory=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # ── Find label column ─────────────────────────────────
    label_col = next(
        (c for c in df.columns if c.lower() in [
            "label", "labels", "class", "spam",
            "is_phishing", "phishing", "target", "category"
        ]), None
    )
    if label_col is None:
        raise HTTPException(
            status_code=400,
            detail=f"No label column found. Columns available: {df.columns.tolist()}"
        )

    # ── Normalize labels to 0/1 ───────────────────────────
    y_series = df[label_col].astype(str).str.strip().str.lower()
    y_series = y_series.replace({
        "phishing": "1", "spam": "1", "malicious": "1", "true": "1",
        "legit": "0", "ham": "0", "legitimate": "0", "false": "0"
    })
    y_true = pd.to_numeric(y_series, errors="coerce").dropna().astype(int)
    df = df.loc[y_true.index].reset_index(drop=True)
    y_true = y_true.reset_index(drop=True)

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="No valid labeled rows found.")

    # ── Detect pipeline ───────────────────────────────────
    has_auth = all(c in df.columns for c in ["spf_result", "dkim_result", "dmarc_result"])
    body_col = next((c for c in df.columns if c.lower() in [
        "body", "body_plain", "text", "message", "content", "email_body"
    ]), None)
    subj_col = next((c for c in df.columns if c.lower() in [
        "subject", "title", "header_subject"
    ]), None)

    # ── Run inference ─────────────────────────────────────
    try:
        if has_auth:
            pipeline = "Tabular Random Forest"
            X = extract_features_dataframe(df)
            X_scaled = scaler.transform(X)
            y_pred = model.predict(X_scaled)
        elif body_col or subj_col:
            if nlp_model is None or tfidf is None:
                raise HTTPException(status_code=503, detail="NLP model not loaded.")
            pipeline = "NLP Fallback (TF-IDF)"
            body = df[body_col].fillna("") if body_col else pd.Series([""] * len(df))
            subj = df[subj_col].fillna("") if subj_col else pd.Series([""] * len(df))
            X_nlp = tfidf.transform(subj + " " + body)
            y_pred = nlp_model.predict(X_nlp)
        else:
            raise HTTPException(
                status_code=400,
                detail="Dataset has no recognizable text or auth columns."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # ── Calculate metrics ─────────────────────────────────
    y_pred_series = pd.Series(y_pred)
    acc  = float(accuracy_score(y_true, y_pred_series))
    prec = float(precision_score(y_true, y_pred_series, zero_division=0))
    rec  = float(recall_score(y_true, y_pred_series, zero_division=0))
    f1   = float(f1_score(y_true, y_pred_series, zero_division=0))
    cm   = confusion_matrix(y_true, y_pred_series).tolist()

    label_dist = y_true.value_counts().to_dict()

    return {
        "file_name": file.filename,
        "total_rows": len(df),
        "pipeline": pipeline,
        "label_col": label_col,
        "label_distribution": {
            "legit": int(label_dist.get(0, 0)),
            "phishing": int(label_dist.get(1, 0)),
        },
        "metrics": {
            "accuracy": round(acc * 100, 2),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
        },
        "confusion_matrix": {
            "tn": cm[0][0],
            "fp": cm[0][1],
            "fn": cm[1][0],
            "tp": cm[1][1],
        },
    }