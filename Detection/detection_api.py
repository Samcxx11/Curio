# Run with: python -m uvicorn detection_api:app --port 8001 --> for ingestion
# Run with: python -m uvicorn detection_api:app --port 8002 --> for testing
# Install:  pip install fastapi uvicorn scikit-learn pandas nltk indic-transliteration

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
import pickle
import os
import nltk
from nltk.corpus import stopwords

nltk.download("stopwords", quiet=True)

app = FastAPI()

# ── Load trained models once at startup ───────────────────────────────────────
# These are saved after you run the notebook once (see /train endpoint below)
MODEL_DIR = os.path.dirname(__file__)

amodel = None       # fake-news classifier (MultinomialNB)
bmodel = None       # clickbait classifier  (MultinomialNB)
fake_vectorizer = None
clickbait_vectorizer = None

def load_models():
    global amodel, bmodel, fake_vectorizer, clickbait_vectorizer
    try:
        with open(os.path.join(MODEL_DIR, "fake_model.pkl"), "rb") as f:
            amodel = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "fake_vectorizer.pkl"), "rb") as f:
            fake_vectorizer = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "clickbait_model.pkl"), "rb") as f:
            bmodel = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "clickbait_vectorizer.pkl"), "rb") as f:
            clickbait_vectorizer = pickle.load(f)
        print("Models loaded successfully.")
    except FileNotFoundError:
        print("WARNING: Model files not found. Call POST /train first.")

load_models()

# ── Text cleaning helpers ──────────────────────────────────────────────────────
eng_stop = set(stopwords.words("english"))

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    HINDI_SUPPORT = True
except ImportError:
    HINDI_SUPPORT = False
    print("indic_transliteration not installed — Hindi support disabled.")

def detect_lang(text: str) -> str:
    if re.search(r'[\u0900-\u097F]', text):
        return "hindi"
    return "eng"

def clean_engtext(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    words = [w for w in text.split() if w not in eng_stop]
    return " ".join(words)

def clean_hinditext(text: str) -> str:
    if HINDI_SUPPORT:
        text = transliterate(str(text), sanscript.DEVANAGARI, sanscript.ITRANS)
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    words = [w for w in text.split() if w not in eng_stop]
    return " ".join(words)

KEEP_WORDS = {"what","why","how","when","who","shocking","secret","revealed",
              "viral","top","best","warning","truth","hidden","risk","must"}
clickbait_stop = eng_stop - KEEP_WORDS

def clean_clickbait_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    words = [w for w in text.split() if w not in clickbait_stop]
    return " ".join(words)

# ── Request / Response models ──────────────────────────────────────────────────
class ArticleRequest(BaseModel):
    title: str
    description: str | None = ""
    source: str | None = ""

class ScoreResponse(BaseModel):
    fake_score: float       # 0-1  (higher = more likely real / trustworthy)
    clickbait_score: float  # 0-1  (higher = more clickbait-y)
    source_score: float     # 0-1  from hardcoded SOURCE_DATABASE
    total_score: float      # 0-100 combined credibility score

# ── Source credibility database (from your notebook) ──────────────────────────
SOURCE_DATABASE = {
    "reuters.com":          0.97, "apnews.com":         0.96,
    "bbc.com":              0.92, "bbc.co.uk":          0.92,
    "theguardian.com":      0.88, "nytimes.com":        0.87,
    "washingtonpost.com":   0.86, "economist.com":      0.92,
    "ft.com":               0.91, "wsj.com":            0.88,
    "bloomberg.com":        0.90, "npr.org":            0.91,
    "thehindu.com":         0.88, "hindustantimes.com": 0.82,
    "indianexpress.com":    0.85, "ndtv.com":           0.80,
    "timesofindia.com":     0.78, "scroll.in":          0.82,
    "thewire.in":           0.78, "livemint.com":       0.82,
    "businessstandard.com": 0.83, "zeenews.india.com":  0.65,
    "cnn.com":              0.78, "foxnews.com":        0.60,
    "msnbc.com":            0.68, "dailymail.co.uk":    0.45,
    "infowars.com":         0.05, "naturalnews.com":    0.08,
}

def get_source_score(source_name: str) -> float:
    name = source_name.lower().strip()
    # Try direct match, then partial domain match
    if name in SOURCE_DATABASE:
        return SOURCE_DATABASE[name]
    for domain, score in SOURCE_DATABASE.items():
        if domain in name or name in domain:
            return score
    return 0.5  # neutral default for unknown sources

# ── Scoring functions ──────────────────────────────────────────────────────────
def compute_fake_score(text: str) -> float:
    """Returns 0-1 where 1 = very likely real news."""
    if not amodel or not fake_vectorizer:
        return 0.5
    lang = detect_lang(text)
    clean = clean_hinditext(text) if lang == "hindi" else clean_engtext(text)
    if not clean.strip():
        return 0.5
    vec = fake_vectorizer.transform([clean])
    fake_prob = amodel.predict_proba(vec)[0][1]
    return round(1 - fake_prob, 4)

def compute_clickbait_score(headline: str) -> float:
    """Returns 0-1 where 1 = very clickbait-y."""
    if not bmodel or not clickbait_vectorizer:
        return 0.5
    clean = clean_clickbait_text(headline)
    if not clean.strip():
        return 0.5
    vec = clickbait_vectorizer.transform([clean])
    return round(float(bmodel.predict_proba(vec)[0][1]), 4)

def compute_total_score(fake: float, clickbait: float, source: float) -> float:
    """
    Mirrors your notebook formula:
    total = (0.4*f + 0.4*(1-c) + 0.1*m + 0.1*s) * 100
    m = multiplatform (skipped here, treated as neutral 0.5)
    """
    multi = 0.5  # placeholder — add NewsAPI cross-check if needed
    return round((0.4 * fake + 0.4 * (1 - clickbait) + 0.1 * multi + 0.1 * source) * 100, 2)

# ── API Routes ─────────────────────────────────────────────────────────────────

@app.post("/score", response_model=ScoreResponse)
async def score_article(req: ArticleRequest):
    """
    Main endpoint called by your Node.js backend.
    POST /score  { title, description, source }
    """
    if not req.title:
        raise HTTPException(status_code=400, detail="title is required")

    full_text = f"{req.title} {req.description or ''}"

    fake      = compute_fake_score(full_text)
    clickbait = compute_clickbait_score(req.title)   # headline only for clickbait
    source    = get_source_score(req.source or "")
    total     = compute_total_score(fake, clickbait, source)

    return ScoreResponse(
        fake_score=fake,
        clickbait_score=clickbait,
        source_score=source,
        total_score=total,
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": amodel is not None and bmodel is not None
    }

# ── One-time training endpoint ─────────────────────────────────────────────────
# Hit this once after placing your CSV files in the same folder.
# After it runs, model .pkl files are saved and loaded on every future startup.

class TrainResponse(BaseModel):
    fake_accuracy: float
    clickbait_accuracy: float

@app.post("/train", response_model=TrainResponse)
async def train_models():
    """
    Trains both models from your CSV files and saves them as .pkl files.
    Requires: merged_ds.csv and clean_data.csv in the same directory.
    Only needs to be called once (or when you have new training data).
    """
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer as TF
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score

    global amodel, bmodel, fake_vectorizer, clickbait_vectorizer

    results = {}

    # — Fake news model —
    try:
        df = pd.read_csv(os.path.join(MODEL_DIR, "merged_ds.csv")).dropna()
        X_train, X_test, y_train, y_test = train_test_split(
            df["clean_text"], df["FAKE"], test_size=0.2, random_state=42, stratify=df["FAKE"]
        )
        fv = TF(max_features=5000, ngram_range=(1, 2))
        X_tr = fv.fit_transform(X_train)
        am = MultinomialNB()
        am.fit(X_tr, y_train)
        acc = accuracy_score(y_test, am.predict(fv.transform(X_test)))
        results["fake_accuracy"] = round(acc, 4)

        with open(os.path.join(MODEL_DIR, "fake_model.pkl"), "wb") as f:
            pickle.dump(am, f)
        with open(os.path.join(MODEL_DIR, "fake_vectorizer.pkl"), "wb") as f:
            pickle.dump(fv, f)
        amodel, fake_vectorizer = am, fv
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="merged_ds.csv not found")

    # — Clickbait model —
    try:
        df2 = pd.read_csv(os.path.join(MODEL_DIR, "clean_data.csv")).dropna()
        X_train2, X_test2, y_train2, y_test2 = train_test_split(
            df2["headline"], df2["clickbait"], test_size=0.2, random_state=42, stratify=df2["clickbait"]
        )
        cv = TF(max_features=5000, ngram_range=(1, 2))
        X_tr2 = cv.fit_transform(X_train2)
        bm = MultinomialNB()
        bm.fit(X_tr2, y_train2)
        acc2 = accuracy_score(y_test2, bm.predict(cv.transform(X_test2)))
        results["clickbait_accuracy"] = round(acc2, 4)

        with open(os.path.join(MODEL_DIR, "clickbait_model.pkl"), "wb") as f:
            pickle.dump(bm, f)
        with open(os.path.join(MODEL_DIR, "clickbait_vectorizer.pkl"), "wb") as f:
            pickle.dump(cv, f)
        bmodel, clickbait_vectorizer = bm, cv
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="clean_data.csv not found")

    return TrainResponse(**results)
