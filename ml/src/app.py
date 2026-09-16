from fastapi import FastAPI, HTTPException

from .inference import predict
from .risk import calculate_risk
from .trust import update_trust
from .policy import evaluate_policy
from .xai import explain
from .schemas import PredictionRequest, PredictionResponse


app = FastAPI(
    title="Zero Trust Insider Threat Detection ML Service",
    version="1.0.0"
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "multi_source_ueba_rf"
    }


@app.post(
    "/predict",
    response_model=PredictionResponse
)
def predict_endpoint(request: PredictionRequest):
    try:
        prediction = predict(request.features)

        risk_result = calculate_risk(
            request.features
        )

        trust_score = update_trust(
            request.user,
            risk_result["risk_score"]
        )

        policy_result = evaluate_policy(
            risk_result["risk_score"],
            trust_score
        )

        xai_reasons = explain(
            request.features,
            top_n=5
        )

        return {
            "user": request.user,
            "threat_probability": prediction["threat_probability"],
            "contextual_risk_score": risk_result["contextual_risk_score"],
            "risk_score": risk_result["risk_score"],
            "trust_score": trust_score,
            "policy_action": policy_result["action"],
            "policy_reason": policy_result["reason"],
            "xai_reasons": xai_reasons
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )