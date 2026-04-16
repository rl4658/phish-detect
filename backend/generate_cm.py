import os
import sys
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix
import joblib

# Allow imports when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.preprocessor import extract_features_dataframe, FEATURE_COLUMNS

def print_cm(name, cm):
    print(f"\n{'-'*40}")
    print(f" {name} - Confusion Matrix")
    print(f"{'-'*40}")
    print(f"  TN (Legit correctly identified)     = {cm[0][0]:,}")
    print(f"  FP (Legit incorrectly flagged)      = {cm[0][1]:,}")
    print(f"  FN (Phishing incorrectly passed)    = {cm[1][0]:,}")
    print(f"  TP (Phishing correctly identified)  = {cm[1][1]:,}")
    print(f"{'-'*40}")

def main():
    print("=" * 60)
    print("  Generate Confusion Matrices")
    print("=" * 60)

    # 1. Load Data
    data_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "email_dataset_100k.csv",
    )
    print(f"\nLoading dataset from {data_path}...")
    needed_cols = [
        "spf_result", "dkim_result", "dmarc_result",
        "num_urls", "has_attachments", "contains_tracking_token",
        "from_domain", "reply_to",
        "num_received_headers", "x_spam_score", "has_html",
        "label", "subject", "body_plain"
    ]
    df = pd.read_csv(data_path, usecols=needed_cols, low_memory=False)
    
    print("\nExtracting tabular features...")
    X = extract_features_dataframe(df)
    y = df["label"].astype(int)
    
    print("Splitting data (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    rf_model_path = os.path.join(models_dir, "phishing_model.pkl")
    scaler_path = os.path.join(models_dir, "preprocessor.pkl")
    nlp_model_path = os.path.join(models_dir, "nlp_model.pkl")
    tfidf_path = os.path.join(models_dir, "tfidf.pkl")

    print("\nLoading scaler and trained Random Forest model...")
    scaler = joblib.load(scaler_path)
    rf_model = joblib.load(rf_model_path)
    
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    cm_data = []

    # --- 1. Trained Random Forest ---
    print("\n[1/2] Evaluating Trained Random Forest...")
    rf_pred = rf_model.predict(X_test_scaled)
    cm_rf = confusion_matrix(y_test, rf_pred)
    print_cm("Trained Random Forest", cm_rf)
    cm_data.append(("Trained Random Forest", y_test, rf_pred))

    # --- 2. NLP Model ---
    print("\n[2/2] Evaluating Trained NLP Model...")
    if os.path.exists(nlp_model_path) and os.path.exists(tfidf_path):
        nlp_model = joblib.load(nlp_model_path)
        tfidf = joblib.load(tfidf_path)
        
        df["subject"] = df["subject"].fillna("")
        df["body_plain"] = df["body_plain"].fillna("")
        df["combined_text"] = df["subject"] + " " + df["body_plain"]
        
        X_nlp = tfidf.transform(df["combined_text"])
        _, X_test_nlp, _, y_test_nlp = train_test_split(
            X_nlp, y, test_size=0.2, random_state=42, stratify=y
        )
        
        nlp_pred = nlp_model.predict(X_test_nlp)
        cm_nlp = confusion_matrix(y_test_nlp, nlp_pred)
        print_cm("Trained NLP Model", cm_nlp)
        cm_data.append(("Trained NLP Model", y_test_nlp, nlp_pred))
    else:
        print("NLP Model files not found. Skipping.")

    # Plotting to PNG if matplotlib is available
    try:
        import matplotlib.pyplot as plt
        from sklearn.metrics import ConfusionMatrixDisplay
        
        fig, axes = plt.subplots(1, len(cm_data), figsize=(6 * len(cm_data), 5))
        
        for i, (name, y_true, y_pred) in enumerate(cm_data):
            ConfusionMatrixDisplay.from_predictions(
                y_true, y_pred, ax=axes[i], display_labels=["Legit", "Phishing"], cmap="Blues"
            )
            axes[i].set_title(name)
            
        plt.tight_layout()
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "confusion_matrices.png")
        plt.savefig(output_path, dpi=300)
        print(f"\n[DONE] Plot saved to: {output_path}")
        
    except ImportError:
        print("\n[INFO] matplotlib is not installed. Skipping plot generation.")
        print("        To generate plot images, run: pip install matplotlib")

if __name__ == "__main__":
    main()
