import numpy as np

from .inference import predict
from .context import calculate_contextual_risk


ML_WEIGHT = 0.70
CONTEXT_WEIGHT = 0.30


def calculate_adaptive_risk(
    threat_probability: float,
    contextual_risk_score: float
) -> float:
    probability = float(
        np.clip(threat_probability, 0.0, 1.0)
    )

    contextual_risk = float(
        np.clip(contextual_risk_score, 0.0, 100.0)
    )

    risk_score = (
        ML_WEIGHT * probability * 100.0
        + CONTEXT_WEIGHT * contextual_risk
    )

    return round(
        float(np.clip(risk_score, 0.0, 100.0)),
        2
    )


def calculate_risk(features: dict) -> dict:
    prediction = predict(features)

    threat_probability = prediction["threat_probability"]

    contextual_risk_score = calculate_contextual_risk(
        features
    )

    risk_score = calculate_adaptive_risk(
        threat_probability,
        contextual_risk_score
    )

    return {
        "threat_probability": threat_probability,
        "contextual_risk_score": contextual_risk_score,
        "risk_score": risk_score
    }