import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../models/prisma.js";
import { db } from "../models/db.js";
import { sendOtpEmail } from "./email-service.js";
import { sendPasswordResetEmail } from "./email-service.js";
import {
  generateJwtToken
} from "../middleware/auth.js";

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

export function sanitizeUser(user) {
  if (!user) return null;

  const {
    passwordHash,
    passwordResetTokens,
    ...safeUser
  } = user;

  return safeUser;
}

export function isAdminUser(user) {
  return (
    user &&
    (user.roleCode === "SECURITY_ADMIN" ||
      user.roleCode === "SYSTEM_ADMIN" ||
      user.role === "SECURITY_ADMIN" ||
      user.role === "SYSTEM_ADMIN")
  );
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp) {
  return crypto
    .createHash("sha256")
    .update(String(otp))
    .digest("hex");
}

export async function loginWithPassword(email, password, req) {
  const cleanEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });

  if (!user || user.status !== "ACTIVE" || !isAdminUser(user)) {
    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password."
      }
    };
  }

  if (!user.passwordHash) {
    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password."
      }
    };
  }

  const valid = await bcrypt.compare(
    String(password),
    user.passwordHash
  );

  if (!valid) {
    db.appendAuditLog({
      userId: user.id,
      userName: user.name,
      action: "ADMIN_LOGIN_FAILED",
      category: "AUTH",
      severity: "WARNING",
      details: {
        reason: "Invalid password"
      },
      ipAddress:
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "127.0.0.1"
    });

    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password."
      }
    };
  }

  await prisma.mfaSession.updateMany({
    where: {
      userId: user.id,
      status: "PENDING"
    },
    data: {
      status: "EXPIRED"
    }
  });

  const otp = generateOtp();
  const challengeHash = hashOtp(otp);

  const session = await prisma.mfaSession.create({
    data: {
      userId: user.id,
      challengeHash,
      status: "PENDING",
      action: "LOGIN",
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt: new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
      )
    }
  });

  try {
  await sendOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES
  });

  console.log(`✅ OTP email sent to ${user.email}`);
} catch (error) {
  console.error("❌ OTP email sending failed:", error.message);

  await prisma.mfaSession.update({
    where: { id: session.id },
    data: { status: "FAILED" }
  });

  return {
    success: false,
    status: 503,
    error: {
      code: "OTP_EMAIL_FAILED",
      message: "Unable to send OTP email. Please try again."
    }
  };
}

  return {
    success: true,
    status: 200,
    requiresMfa: true,
    challengeId: session.id,
    user: sanitizeUser(user),
    message: "Password verified. OTP required."
  };
}

export async function verifyLoginOtp(challengeId, otp, req) {
  const session = await prisma.mfaSession.findUnique({
    where: { id: challengeId }
  });

  if (!session) {
    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_CHALLENGE",
        message: "Invalid MFA challenge."
      }
    };
  }

  if (session.status !== "PENDING") {
    return {
      success: false,
      status: 401,
      error: {
        code: "CHALLENGE_INVALID",
        message: "MFA challenge is no longer valid."
      }
    };
  }

  if (new Date() > new Date(session.expiresAt)) {
    await prisma.mfaSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" }
    });

    return {
      success: false,
      status: 401,
      error: {
        code: "OTP_EXPIRED",
        message: "OTP has expired."
      }
    };
  }
if (session.attempts >= session.maxAttempts) {
  await prisma.mfaSession.update({
    where: { id: session.id },
    data: { status: "FAILED" }
  });

  return {
      success: false,
      status: 429,
      error: {
        code: "MFA_LOCKED",
        message: "Too many OTP attempts."
      }
    };
  }

  const valid =
    hashOtp(otp) === session.challengeHash;

  if (!valid) {
    const attempts = session.attempts + 1;

    await prisma.mfaSession.update({
      where: { id: session.id },
      data: {
        attempts,
        ...(attempts >= session.maxAttempts
          ? { status: "FAILED"}
          : {})
      }
    });

    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_OTP",
        message: "Invalid OTP."
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user || user.status !== "ACTIVE" || !isAdminUser(user)) {
    return {
      success: false,
      status: 403,
      error: {
        code: "FORBIDDEN",
        message: "Administrator account required."
      }
    };
  }

  await prisma.mfaSession.update({
    where: { id: session.id },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date()
    }
  });

  const token = generateJwtToken(
    user,
    true,
    null
  );

  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ADMIN_MFA_VERIFIED",
    category: "AUTH",
    severity: "INFO",
    details: {
      method: "OTP",
      challengeId: session.id
    },
    ipAddress:
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "127.0.0.1"
  });

  return {
    success: true,
    status: 200,
    user: sanitizeUser(user),
    token,
    mfaVerified: true,
    message: "Authentication successful."
  };
}

export async function resendOtp(challengeId) {
  const oldSession = await prisma.mfaSession.findUnique({
    where: { id: challengeId }
  });

  if (!oldSession || oldSession.status !== "PENDING") {
    return {
      success: false,
      status: 401,
      error: {
        code: "INVALID_CHALLENGE",
        message: "MFA challenge is no longer valid."
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: oldSession.userId }
  });

  if (!user || !isAdminUser(user)) {
    return {
      success: false,
      status: 403,
      error: {
        code: "FORBIDDEN",
        message: "Administrator account required."
      }
    };
  }

  await prisma.mfaSession.update({
    where: { id: oldSession.id },
    data: { status: "EXPIRED" }
  });

  const otp = generateOtp();

  const newSession = await prisma.mfaSession.create({
    data: {
      userId: user.id,
      challengeHash: hashOtp(otp),
      status: "PENDING",
      action: "LOGIN",
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt: new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
      )
    }
  });

  try {
  await sendOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES
  });

  console.log(`✅ Resend OTP email sent to ${user.email}`);
} catch (error) {
  console.error("❌ Resend OTP email failed:", error.message);

  await prisma.mfaSession.update({
    where: { id: newSession.id },
    data: { status: "FAILED" }
  });

  return {
    success: false,
    status: 503,
    error: {
      code: "OTP_EMAIL_FAILED",
      message: "Unable to resend OTP email."
    }
  };
}

  return {
    success: true,
    status: 200,
    challengeId: newSession.id,
    message: "A new OTP has been generated."
  };
}