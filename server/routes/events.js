import { Router } from "express";
import { db } from "../models/db.js";
import { sseManager } from "../services/sse.js";

const router = Router();

// GET /api/events
router.get("/", (req, res) => {
  try {
    return res.json({
      success: true,
      events: db.activityEvents || []
    });
  } catch (error) {
    console.error("Events fetch error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "EVENTS_ERROR",
        message: error.message || "Unable to fetch events."
      }
    });
  }
});

// GET /api/events/stream
router.get("/stream", (req, res) => {
  try {
    sseManager.addClient(res);

    req.on("close", () => {
      sseManager.removeClient(res);
    });
  } catch (error) {
    console.error("SSE connection error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: {
          code: "SSE_ERROR",
          message: error.message || "Unable to establish event stream."
        }
      });
    }

    res.end();
  }
});

export default router;