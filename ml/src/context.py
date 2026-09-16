import numpy as np


def calculate_contextual_risk(features: dict) -> float:
    risk_components = []

    if features.get("is_weekend", 0) == 1:
        risk_components.append(20.0)

    if features.get("logon_unique_pc_count", 0) > 2:
        risk_components.append(20.0)

    if features.get("device_unique_pc_count", 0) > 2:
        risk_components.append(20.0)

    if features.get("file_content_events", 0) > 10:
        risk_components.append(20.0)

    if features.get("attachments_total", 0) > 5:
        risk_components.append(20.0)

    if features.get("cross_source_activity", 0) > 20:
        risk_components.append(20.0)

    if not risk_components:
        return 0.0

    return round(
        float(np.clip(sum(risk_components), 0.0, 100.0)),
        2
    )