"""
Train a RandomForestClassifier on the Isuranga email dataset.
Exports phishing_model.pkl and preprocessor.pkl to backend/models/.

Usage:
    python -m backend.train
    OR
    cd backend && ../backend/venv/Scripts/python.exe train.py
"""

import os
import sys
import time
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from sklearn.feature_extraction.text import TfidfVectorizer

# Allow imports when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.preprocessor import extract_features_dataframe, FEATURE_COLUMNS


def main():
    print("=" * 60)
    print("  PhishDetect — Model Training Pipeline")
    print("=" * 60)

    # ── 1. Load Data ──────────────────────────────────────────
    data_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "email_dataset_100k.csv",
    )
    print(f"\n[1/5] Loading dataset from {data_path}...")
    t0 = time.time()

    # Only load columns we need to save memory
    needed_cols = [
        "spf_result", "dkim_result", "dmarc_result",
        "num_urls", "has_attachments", "contains_tracking_token",
        "from_domain", "reply_to",
        "num_received_headers", "x_spam_score", "has_html",
        "label", "subject", "body_plain"
    ]
    df = pd.read_csv(data_path, usecols=needed_cols, low_memory=False)
    print(f"       Loaded {len(df):,} rows in {time.time() - t0:.1f}s")

    # ── 2. Feature Engineering ────────────────────────────────
    print("\n[2/5] Extracting features...")
    t0 = time.time()
    X = extract_features_dataframe(df)
    y = df["label"].astype(int)
    print(f"       Extracted {len(FEATURE_COLUMNS)} features in {time.time() - t0:.1f}s")
    print(f"       Class distribution: legit={int((y == 0).sum()):,}  phishing={int((y == 1).sum()):,}")

    # ── 3. Train / Test Split ─────────────────────────────────
    print("\n[3/5] Splitting data (80/20, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"       Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # ── 4. Scale + Train ──────────────────────────────────────
    print("\n[4/5] Scaling features and training RandomForestClassifier...")
    t0 = time.time()
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,  # Use all CPU cores
        class_weight="balanced",
    )
    model.fit(X_train_scaled, y_train)
    train_time = time.time() - t0
    print(f"       Training completed in {train_time:.1f}s")

    # ── 5. Evaluate ───────────────────────────────────────────
    print("\n[5/5] Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"\n{'-' * 40}")
    print(f"  Accuracy:  {accuracy:.4f}  ({accuracy * 100:.2f}%)")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"{'-' * 40}")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Legit", "Phishing"]))

    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  TN={cm[0][0]:,}  FP={cm[0][1]:,}")
    print(f"  FN={cm[1][0]:,}  TP={cm[1][1]:,}")

    # Feature importances
    print("\nFeature Importances:")
    importances = model.feature_importances_
    for name, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 50)
        print(f"  {name:.<25s} {imp:.4f}  {bar}")

    # ── 6. NLP Fallback Model Training ────────────────────────
    print("\n[6/6] Training Fallback NLP Model (TF-IDF) on subject and body...")
    t0_nlp = time.time()
    
    # Fill NA and combine subject + body
    df["subject"] = df["subject"].fillna("")
    df["body_plain"] = df["body_plain"].fillna("")
    df["combined_text"] = df["subject"] + " " + df["body_plain"]
    
    tfidf = TfidfVectorizer(max_features=3000, stop_words="english", ngram_range=(1, 2))
    X_nlp = tfidf.fit_transform(df["combined_text"])
    X_train_nlp, X_test_nlp, y_train_nlp, y_test_nlp = train_test_split(
        X_nlp, y, test_size=0.2, random_state=42, stratify=y
    )
    
    nlp_model = RandomForestClassifier(
        n_estimators=100,  # Lower estimators for memory efficiency
        max_depth=25,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    )
    nlp_model.fit(X_train_nlp, y_train_nlp)
    
    nlp_pred = nlp_model.predict(X_test_nlp)
    nlp_acc = accuracy_score(y_test_nlp, nlp_pred)
    print(f"       NLP Model Training completed in {time.time() - t0_nlp:.1f}s")
    print(f"       NLP Model Accuracy: {nlp_acc:.4f}  ({nlp_acc * 100:.2f}%)")

    # ── Export ────────────────────────────────────────────────
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "phishing_model.pkl")
    scaler_path = os.path.join(models_dir, "preprocessor.pkl")
    nlp_model_path = os.path.join(models_dir, "nlp_model.pkl")
    tfidf_path = os.path.join(models_dir, "tfidf.pkl")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(nlp_model, nlp_model_path)
    joblib.dump(tfidf, tfidf_path)

    print(f"\n[OK] Tabular Model saved to {model_path}")
    print(f"[OK] Scaler saved to {scaler_path}")
    print(f"[OK] NLP Model saved to {nlp_model_path}")
    print(f"[OK] TF-IDF saved to {tfidf_path}")

    if accuracy >= 0.97:
        print(f"\n>>> Target accuracy of >97% ACHIEVED ({accuracy * 100:.2f}%)")
    else:
        print(f"\n[!] Accuracy {accuracy * 100:.2f}% is below 97% target. Consider tuning hyperparameters.")

    return accuracy


if __name__ == "__main__":
    main()
