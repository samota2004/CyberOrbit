import shap
import numpy as np
import pandas as pd

from .inference import model, FEATURE_NAMES


explainer = shap.TreeExplainer(model)


def explain(features: dict, top_n: int = 5) -> list:
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

    shap_values = explainer.shap_values(input_data)

    if isinstance(shap_values, list):
        values = shap_values[1][0]
    elif len(shap_values.shape) == 3:
        values = shap_values[0, :, 1]
    else:
        values = shap_values[0]

    contributions = pd.DataFrame({
        "feature": FEATURE_NAMES,
        "value": input_data.iloc[0].values,
        "shap_value": values
    })

    contributions["impact"] = np.where(
        contributions["shap_value"] > 0,
        "increases threat",
        "decreases threat"
    )

    contributions["absolute_impact"] = (
        contributions["shap_value"].abs()
    )

    contributions = contributions.sort_values(
        "absolute_impact",
        ascending=False
    ).head(top_n)

    return contributions[
        ["feature", "value", "shap_value", "impact"]
    ].to_dict(orient="records")