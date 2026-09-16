def evaluate_policy(risk_score: float, trust_score: float) -> dict:
    risk = float(risk_score)
    trust = float(trust_score)

    if risk < 20 and trust >= 80:
        action = "ALLOW"
        reason = "Low risk and high trust"

    elif risk < 40 and trust >= 60:
        action = "MONITOR"
        reason = "Moderate risk requires monitoring"

    elif risk < 60 and trust >= 40:
        action = "MFA"
        reason = "Elevated risk requires additional authentication"

    elif risk < 80 and trust >= 20:
        action = "ADMIN_APPROVAL"
        reason = "High risk requires administrative approval"

    else:
        action = "RESTRICT_FREEZE"
        reason = "Critical risk or insufficient trust"

    return {
        "action": action,
        "reason": reason
    }