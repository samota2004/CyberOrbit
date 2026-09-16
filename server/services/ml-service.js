const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

export async function predictWithMLService(user, features) {
  const response = await fetch(
    `${ML_SERVICE_URL}/predict`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user,
        features
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "ML service prediction failed"
    );
  }

  return data;
}

export async function checkMLServiceHealth() {
  const response = await fetch(
    `${ML_SERVICE_URL}/health`
  );

  if (!response.ok) {
    throw new Error("ML service is unavailable");
  }

  return response.json();
}