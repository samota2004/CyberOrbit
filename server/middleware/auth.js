import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { db } from "../models/db.js";

const JWT_SECRET = process.env.JWT_SECRET;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");x
}

function base64UrlDecode(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}

export function generateJwtToken(user, mfaVerified = false, deviceId = null) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.roleCode || user.role,
    mfaVerified,
    deviceId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwtToken(token) {
  try {
    if (!token || !JWT_SECRET) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload));

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function getRequesterUser(req) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      console.log("AUTH DEBUG: Missing Bearer token");
      return null;
    }

    const token = authorization.substring(7);
    const payload = verifyJwtToken(token);

    if (!payload) {
      console.log("AUTH DEBUG: Invalid JWT");
      return null;
    }

    console.log("AUTH DEBUG: JWT payload:", {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      mfaVerified: payload.mfaVerified,
      exp: payload.exp
    });

    if (!payload.sub || !payload.mfaVerified) {
      console.log("AUTH DEBUG: Missing sub or MFA not verified");
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      console.log(
        "AUTH DEBUG: PostgreSQL user not found:",
        payload.sub
      );
      return null;
    }

    console.log("AUTH DEBUG: PostgreSQL user:", {
      id: user.id,
      email: user.email,
      roleCode: user.roleCode,
      status: user.status
    });

    if (user.status !== "ACTIVE") {
      console.log(
        "AUTH DEBUG: User status is not ACTIVE:",
        user.status
      );
      return null;
    }

    if (
      user.roleCode !== "SECURITY_ADMIN" &&
      user.roleCode !== "SYSTEM_ADMIN"
    ) {
      console.log(
        "AUTH DEBUG: Insufficient role:",
        user.roleCode
      );
      return null;
    }

    console.log("AUTH DEBUG: Administrator authentication passed");

    return user;
  } catch (error) {
    console.error(
      "AUTH DEBUG ERROR:",
      error?.message || error
    );
    return null;
  }
}

export async function requireSecurityAdmin(req, res, next) {
  const user = await getRequesterUser(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Administrator authentication required."
      }
    });
  }

  req.user = user;
  next();
}

export { db };