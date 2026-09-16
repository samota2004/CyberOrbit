import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "multi_source_ueba_rf.joblib"
SCHEMA_PATH = MODEL_DIR / "multi_source_feature_schema.json"


model = joblib.load(MODEL_PATH)

with open(SCHEMA_PATH, "r") as f:
    schema = json.load(f)

FEATURE_NAMES = schema["feature_names"]


def predict(features: dict) -> dict:
    missing_features = [
        feature
        for feature in FEATURE_NAMES
        if feature not in features
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )

    input_data = pd.DataFrame(
        [[features[feature] for feature in FEATURE_NAMES]],
        columns=FEATURE_NAMES
    )

    input_data = input_data.apply(
        pd.to_numeric,
        errors="coerce"
    ).fillna(0.0)

    probability = float(
        model.predict_proba(input_data)[0, 1]
    )

    predicted_class = int(
        probability >= 0.5
    )

    return {
        "threat_probability": round(probability, 6),
        "predicted_class": predicted_class
    }