import numpy as np


INITIAL_TRUST = 100.0
TRUST_DECAY_RATE = 0.10
TRUST_RECOVERY_RATE = 0.50
LOW_RISK_THRESHOLD = 20.0

_user_trust_state = {}


def update_trust(user: str, risk_score: float) -> float:
    risk = float(np.clip(risk_score, 0.0, 100.0))

    previous_trust = _user_trust_state.get(
        user,
        INITIAL_TRUST
    )

    if risk >= LOW_RISK_THRESHOLD:
        updated_trust = (
            previous_trust
            - risk * TRUST_DECAY_RATE
        )
    else:
        recovery = (
            (100.0 - previous_trust)
            * TRUST_RECOVERY_RATE
        )

        updated_trust = previous_trust + recovery

    updated_trust = float(
        np.clip(updated_trust, 0.0, 100.0)
    )

    _user_trust_state[user] = updated_trust

    return round(updated_trust, 2)


def get_trust(user: str) -> float:
    return round(
        _user_trust_state.get(user, INITIAL_TRUST),
        2
    )


def reset_trust(user: str) -> None:
    _user_trust_state.pop(user, None)