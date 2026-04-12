# PhishDetect

A high-performance forensic email analysis platform combining a supervised machine learning backend with a cinematic dark-themed React frontend.

## Features
- **Dual-Model ML Architecture**: Employs a dynamic routing engine.
  - **Tabular Metadata Model**: A highly-accurate RandomForestClassifier leveraging SPF, DKIM, DMARC scores, link counts, and domain heuristics. Attains a >99% accuracy rate on fully-structured datasets.
  - **NLP Fallback Model**: Uses a TF-IDF vectorizer and secondary Random Forest to natively analyze language patterns in raw text (`body_plain` + `subject`). Activates automatically on unstructured datasets (e.g., Enron or SpamAssassin) to provide robust domain generalization.
- **Forensic API**: Python FastAPI backend supporting asynchronous batch processing of bulk `.csv` uploads, and raw header extraction of `.eml` files. Fully prevents hard-crashes via intelligent domain-shift handling.
- **Cinematic UI**: Next.js 14 App Router integration using Tailwind CSS, Framer Motion, and Aceternity UI to provide seamless drag-and-drop animations and risk dashboards.

## Structure
- `/backend`: FastAPI Python server, housing the Dual-Model ML pipeline (Tabular feature extracting + Text TF-IDF vectorization).
- `/frontend`: Next.js frontend with drag-and-drop analytics dashboard.
- `/data`: Contains various email test sets including `email_dataset_100k.csv` (used for training), and evaluation generalization sets like `Enron.csv` and `SpamAssasin.csv`.

## Getting Started

### 1. Start the Backend API
Requires Python 3.10+
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

# Run the training script to generate the models based on the csv
python train.py

# Start the API
uvicorn main:app --reload --port 8000
```
*API will run at `http://localhost:8000`*

### 2. Start the Frontend Dashboard
Requires Node.js 18+
```bash
cd frontend
npm install

# Start development server
npm run dev
```
*Website will be available at `http://localhost:3000`*

## How to Test
1. Access the web dashboard.
2. Drag and drop the dataset included in `data/email_dataset_100k.csv` or upload an individual `.eml` file.
3. Review the parsed results, route map tracking, and authentication badges.

## License
MIT
