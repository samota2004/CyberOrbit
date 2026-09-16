from typing import Dict, Any

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    user: str
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    user: str
    threat_probability: float = Field(ge=0.0, le=1.0)
    contextual_risk_score: float = Field(ge=0.0, le=100.0)
    risk_score: float = Field(ge=0.0, le=100.0)
    trust_score: float = Field(ge=0.0, le=100.0)
    policy_action: str
    policy_reason: str
    xai_reasons: list