import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../models/prisma.js";

import {
  getRequesterUser
} from "../middleware/auth.js";

import {
  loginWithPassword,
  verifyLoginOtp,
  resendOtp,
  sanitizeUser,
  isAdminUser
} from "../services/auth-service.js";

import {
  sendPasswordResetEmail
} from "../services/email-service.js";

const router = Router();

router.get("/admins", async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        roleCode: {
          in: ["SECURITY_ADMIN", "SYSTEM_ADMIN"]
        },
        status: "ACTIVE"
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        departmentCode: true,
        status: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error("Admin list error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "ADMIN_LIST_ERROR",
        message: "Unable to load administrator accounts."
      }
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CREDENTIALS",
          message: "Email and password are required."
        }
      });
    }

    const result = await loginWithPassword(
      email,
      password,
      req
    );

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "LOGIN_ERROR",
        message: "Unable to process login."
      }
    });
  }
});

router.post("/mfa/verify", async (req, res) => {
  try {
    const { challengeId, otp } = req.body;

    if (!challengeId || !otp) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_OTP",
          message: "Challenge ID and OTP are required."
        }
      });
    }

    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_OTP",
          message: "OTP must contain exactly 6 digits."
        }
      });
    }

    const result = await verifyLoginOtp(
      challengeId,
      String(otp),
      req
    );

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("MFA error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "MFA_ERROR",
        message: "Unable to verify OTP."
      }
    });
  }
});

router.post("/mfa/resend", async (req, res) => {
  try {
    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CHALLENGE",
          message: "Challenge ID is required."
        }
      });
    }

    const result = await resendOtp(challengeId);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("OTP resend error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "OTP_RESEND_ERROR",
        message: "Unable to resend OTP."
      }
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_EMAIL",
          message: "Admin email is required."
        }
      });
    }

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: cleanEmail
      }
    });

    // Do not reveal whether an account exists.
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !isAdminUser(user)
    ) {
      return res.json({
        success: true,
        message:
          "If this admin email exists, password reset instructions have been sent."
      });
    }

    const token = crypto
      .randomBytes(32)
      .toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null
      }
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(
          Date.now() + 15 * 60 * 1000
        )
      }
    });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: token
      });

      console.log(
        `✅ Password reset email sent to ${user.email}`
      );
    } catch (emailError) {
      console.error(
        "❌ Password reset email failed:",
        emailError.message
      );

      return res.status(503).json({
        success: false,
        error: {
          code: "PASSWORD_RESET_EMAIL_FAILED",
          message:
            "Unable to send password reset email. Please try again."
        }
      });
    }

    return res.json({
      success: true,
      message:
        "If this admin email exists, password reset instructions have been sent."
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "FORGOT_PASSWORD_ERROR",
        message: "Unable to process password reset request."
      }
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const user = await getRequesterUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required."
        }
      });
    }

    return res.json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Auth me error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "AUTH_ME_ERROR",
        message: "Unable to load authenticated user."
      }
    });
  }
});

export default router;