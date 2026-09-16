import { Router } from "express";
import { db } from "../middleware/auth.js";
import {
  predictWithMLService,
  checkMLServiceHealth
} from "../services/ml-service.js";

const router = Router();

router.get("/metrics", async (req, res) => {
  try {
    const health = await checkMLServiceHealth();

    res.json({
      success: true,
      metrics: {
        model: health.model,
        status: health.status,
        service: "Python ML Service"
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    const health = await checkMLServiceHealth();

    res.json({
      success: true,
      ...health
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

router.post("/predict", async (req, res) => {
  try {
    const {
      userId,
      features
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "USER_ID_REQUIRED",
          message: "User ID is required."
        }
      });
    }

    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found."
        }
      });
    }

    if (!features || typeof features !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "FEATURES_REQUIRED",
          message: "ML feature data is required."
        }
      });
    }

    const result = await predictWithMLService(
      user.id,
      features
    );

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(
      "ML prediction failed:",
      err
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "ML_SERVICE_ERROR",
        message: err.message
      }
    });
  }
});

router.get("/model-info", async (req, res) => {
  try {
    const health = await checkMLServiceHealth();

    res.json({
      success: true,
      model: {
        name: health.model,
        service: "Python FastAPI ML Service",
        status: health.status
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

export default router;