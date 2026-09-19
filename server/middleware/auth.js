import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { db } from "../models/db.js";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = normalized.length % 4;

  const padded =
    padding === 0
      ? normalized
      : normalized + "=".repeat(4 - padding);

  return Buffer.from(padded, "base64").toString();
}

function createJwtSignature(encodedHeader, encodedPayload) {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function isAdminRole(role) {
  return (
    role === "SECURITY_ADMIN" ||
    role === "SYSTEM_ADMIN"
  );
}

function getUserRole(user) {
  return user?.roleCode || user?.role || null;
}

export function generateJwtToken(
  user,
  mfaVerified = false,
  deviceId = null
) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    sub: user.id,
    email: user.email,
    role: getUserRole(user),
    mfaVerified,
    deviceId,
    iat: now,
    exp: now + 8 * 60 * 60
  };

  const encodedHeader = base64UrlEncode(
    JSON.stringify(header)
  );

  const encodedPayload = base64UrlEncode(
    JSON.stringify(payload)
  );

  const signature = createJwtSignature(
    encodedHeader,
    encodedPayload
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwtToken(token) {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [
      encodedHeader,
      encodedPayload,
      providedSignature
    ] = parts;

    if (
      !encodedHeader ||
      !encodedPayload ||
      !providedSignature
    ) {
      return null;
    }

    let decodedHeader;

    try {
      decodedHeader = JSON.parse(
        base64UrlDecode(encodedHeader)
      );
    } catch {
      return null;
    }

    if (
      decodedHeader.alg !== "HS256" ||
      decodedHeader.typ !== "JWT"
    ) {
      return null;
    }

    const expectedSignature = createJwtSignature(
      encodedHeader,
      encodedPayload
    );

    const providedSignatureBuffer =
      Buffer.from(providedSignature);

    const expectedSignatureBuffer =
      Buffer.from(expectedSignature);

    if (
      providedSignatureBuffer.length !==
      expectedSignatureBuffer.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        providedSignatureBuffer,
        expectedSignatureBuffer
      )
    ) {
      return null;
    }

    let decodedPayload;

    try {
      decodedPayload = JSON.parse(
        base64UrlDecode(encodedPayload)
      );
    } catch {
      return null;
    }

    const currentTime =
      Math.floor(Date.now() / 1000);

    if (
      !decodedPayload.exp ||
      decodedPayload.exp <= currentTime
    ) {
      return null;
    }

    if (!decodedPayload.sub) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    console.error(
      "AUTH DEBUG: JWT verification error:",
      error?.message || error
    );

    return null;
  }
}

export async function getRequesterUser(req) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      typeof authorization !== "string"
    ) {
      return null;
    }

    if (
      !authorization
        .toLowerCase()
        .startsWith("bearer ")
    ) {
      return null;
    }

    const token =
      authorization.substring(7).trim();

    if (!token) {
      return null;
    }

    const payload =
      verifyJwtToken(token);

    if (!payload) {
      return null;
    }

    if (
      !payload.sub ||
      payload.mfaVerified !== true
    ) {
      return null;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.sub
        }
      });

    if (!user) {
      return null;
    }

    if (user.status !== "ACTIVE") {
      return null;
    }

    return user;
  } catch (error) {
    console.error(
      "AUTH DEBUG ERROR:",
      error?.message || error
    );

    return null;
  }
}

export async function requireAuth(
  req,
  res,
  next
) {
  try {
    const user =
      await getRequesterUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Authentication required."
        }
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "AUTHENTICATION_ERROR",
        message:
          "Unable to authenticate request."
      }
    });
  }
}

export async function requireSecurityAdmin(
  req,
  res,
  next
) {
  try {
    const user =
      await getRequesterUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Administrator authentication required."
        }
      });
    }

    const role = getUserRole(user);

    if (!isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message:
            "Security administrator access required."
        }
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Security admin middleware error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "AUTHORIZATION_ERROR",
        message:
          "Unable to verify administrator access."
      }
    });
  }
}

export async function requireMainAdmin(
  req,
  res,
  next
) {
  try {
    const user =
      await getRequesterUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Administrator authentication required."
        }
      });
    }

    const role = getUserRole(user);

    if (!isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message:
            "Administrator access required."
        }
      });
    }

    if (user.isMainAdmin !== true) {
      return res.status(403).json({
        success: false,
        error: {
          code: "MAIN_ADMIN_REQUIRED",
          message:
            "Main administrator access required."
        }
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Main admin middleware error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "AUTHORIZATION_ERROR",
        message:
          "Unable to verify main administrator access."
      }
    });
  }
}

export { db };