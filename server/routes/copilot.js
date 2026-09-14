import { Router } from "express";
import { geminiService } from "../services/gemini.js";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const {
      message,
      context
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_MESSAGE",
          message: "Message is required"
        }
      });
    }

    const responseText =
      await geminiService.askSecurityCopilot(
        message,
        context,
        {
          referer: req.headers.referer,
          origin: req.headers.origin,
          host: req.headers.host
        }
      );

    res.json({
      success: true,
      reply: responseText,
      timestamp:
        new Date().toISOString()
    });
  } catch (error) {
    console.error(
      "Copilot error:",
      error
    );

    res.status(500).json({
      success: false,
      error: {
        code: "COPILOT_ERROR",
        message:
          "Unable to process copilot request."
      }
    });
  }
});

export default router;