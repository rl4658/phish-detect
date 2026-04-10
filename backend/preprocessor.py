"""
Shared feature extraction logic for the phishing detection model.
Used by both train.py (training) and main.py (inference).
"""

import pandas as pd
import numpy as np


# Mapping for SPF/DKIM/DMARC result strings to numeric scores
AUTH_RESULT_MAP = {
    "pass": 2,
    "neutral": 1,
    "softfail": 1,
    "fail": 0,
    "none": 0,
    "temperror": 0,
    "permerror": 0,
}

FEATURE_COLUMNS = [
    "spf_score",
    "dkim_score",
    "dmarc_score",
    "num_urls",
    "has_attachments",
    "contains_tracking",
    "domain_mismatch",
    "num_received_headers",
    "x_spam_score",
    "has_html",
]


def encode_auth_result(value) -> int:
    """Convert an authentication result string to a numeric score."""
    if pd.isna(value) or value is None:
        return 0
    return AUTH_RESULT_MAP.get(str(value).strip().lower(), 0)


def check_domain_mismatch(from_domain, reply_to) -> int:
    """
    Return 1 if reply_to exists and its domain differs from from_domain.
    This is a strong phishing heuristic — legitimate emails rarely have
    mismatched reply-to domains.
    """
    if pd.isna(reply_to) or reply_to is None or str(reply_to).strip() == "":
        return 0
    reply_to_str = str(reply_to).strip().lower()
    from_domain_str = str(from_domain).strip().lower() if not pd.isna(from_domain) else ""
    # Extract domain from reply_to email address
    if "@" in reply_to_str:
        reply_domain = reply_to_str.split("@")[-1]
    else:
        reply_domain = reply_to_str
    return 1 if reply_domain != from_domain_str else 0


def extract_features_from_row(row: dict) -> dict:
    """
    Extract the 10 ML features from a single email record (dict).
    Works for both CSV rows and parsed EML data.
    """
    return {
        "spf_score": encode_auth_result(row.get("spf_result")),
        "dkim_score": encode_auth_result(row.get("dkim_result")),
        "dmarc_score": encode_auth_result(row.get("dmarc_result")),
        "num_urls": int(row.get("num_urls", 0)) if not pd.isna(row.get("num_urls", 0)) else 0,
        "has_attachments": int(bool(row.get("has_attachments", False))) if not pd.isna(row.get("has_attachments", False)) else 0,
        "contains_tracking": int(bool(row.get("contains_tracking_token", False))) if not pd.isna(row.get("contains_tracking_token", False)) else 0,
        "domain_mismatch": check_domain_mismatch(
            row.get("from_domain", ""), row.get("reply_to", "")
        ),
        "num_received_headers": int(row.get("num_received_headers", 0)) if not pd.isna(row.get("num_received_headers", 0)) else 0,
        "x_spam_score": float(row.get("x_spam_score", 0.0)) if not pd.isna(row.get("x_spam_score", 0.0)) else 0.0,
        "has_html": int(bool(row.get("has_html", False))) if not pd.isna(row.get("has_html", False)) else 0,
    }


def extract_features_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorized feature extraction for an entire DataFrame.
    Much faster than row-by-row for training on large datasets.
    """
    features = pd.DataFrame()

    features["spf_score"] = df["spf_result"].apply(encode_auth_result)
    features["dkim_score"] = df["dkim_result"].apply(encode_auth_result)
    features["dmarc_score"] = df["dmarc_result"].apply(encode_auth_result)
    features["num_urls"] = pd.to_numeric(df["num_urls"], errors="coerce").fillna(0).astype(int)
    features["has_attachments"] = df["has_attachments"].apply(
        lambda x: 1 if str(x).strip().lower() in ("true", "1", "yes") else 0
    )
    features["contains_tracking"] = df["contains_tracking_token"].apply(
        lambda x: 1 if str(x).strip().lower() in ("true", "1", "yes") else 0
    )

    # Domain mismatch: vectorized
    reply_to = df["reply_to"].fillna("").astype(str).str.strip().str.lower()
    from_domain = df["from_domain"].fillna("").astype(str).str.strip().str.lower()
    reply_domain = reply_to.apply(lambda x: x.split("@")[-1] if "@" in x else x)
    features["domain_mismatch"] = (
        (reply_to != "") & (reply_domain != from_domain)
    ).astype(int)

    features["num_received_headers"] = (
        pd.to_numeric(df["num_received_headers"], errors="coerce").fillna(0).astype(int)
    )
    features["x_spam_score"] = (
        pd.to_numeric(df["x_spam_score"], errors="coerce").fillna(0.0)
    )
    features["has_html"] = df["has_html"].apply(
        lambda x: 1 if str(x).strip().lower() in ("true", "1", "yes") else 0
    )

    return features
