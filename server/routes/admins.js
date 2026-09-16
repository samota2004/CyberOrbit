import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import {
  requireSecurityAdmin,
  requireMainAdmin,
  db
} from "../middleware/auth.js";
import { sanitizeUser } from "../services/auth-service.js";

const router = Router();

const ADMIN_ROLES = [
  "SECURITY_ADMIN",
  "SYSTEM_ADMIN"
];

const ADMIN_STATUSES = [
  "ACTIVE",
  "DISABLED"
];

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function isAdminStatus(status) {
  return ADMIN_STATUSES.includes(status);
}

function normalizeAdmin(user) {
  if (!user) {
    return null;
  }

  return {
    ...sanitizeUser(user),
    role:
      user.roleCode ||
      user.role ||
      "SECURITY_ADMIN",
    department:
      user.department?.code ||
      user.departmentCode ||
      "ENGINEERING",
    status:
      user.status ||
      "ACTIVE",
    isMainAdmin:
      Boolean(user.isMainAdmin)
  };
}

function generateAdminEmployeeId() {
  return `ADM-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

router.get(
  "/",
  requireSecurityAdmin,
  async (req, res) => {
    try {
      const admins =
        await prisma.user.findMany({
          where: {
            roleCode: {
              in: ADMIN_ROLES
            }
          },
          include: {
            department: true
          },
          orderBy: {
            createdAt: "desc"
          }
        });

      return res.json({
        success: true,
        admins:
          admins.map(normalizeAdmin)
      });
    } catch (error) {
      console.error(
        "GET /admins error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "ADMINS_FETCH_FAILED",
          message:
            "Unable to fetch administrators."
        }
      });
    }
  }
);

router.post(
  "/",
  requireMainAdmin,
  async (req, res) => {
    try {
      const body = req.body || {};

      const name =
        String(body.name || "").trim();

      const email =
        String(body.email || "")
          .trim()
          .toLowerCase();

      const password =
        String(body.password || "");

      const departmentCode =
        body.departmentCode ||
        body.department ||
        "ENGINEERING";

      const roleCode =
        body.roleCode ||
        body.role ||
        "SECURITY_ADMIN";

      const status =
        body.status ||
        "ACTIVE";

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ADMIN_DATA",
            message:
              "Name, email, and password are required."
          }
        });
      }

      if (!isAdminRole(roleCode)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ADMIN_ROLE",
            message:
              "Only administrator roles are allowed."
          }
        });
      }

      if (!isAdminStatus(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ADMIN_STATUS",
            message:
              "Status must be ACTIVE or DISABLED."
          }
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: "WEAK_PASSWORD",
            message:
              "Admin password must contain at least 8 characters."
          }
        });
      }

      const existing =
        await prisma.user.findUnique({
          where: {
            email
          }
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message:
              "A user with this email already exists."
          }
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const admin =
        await prisma.user.create({
          data: {
            employeeId:
              generateAdminEmployeeId(),

            name,

            email,

            passwordHash,

            passwordChangedAt:
              new Date(),

            departmentCode,

            roleCode,

            status,

            isMainAdmin:
              false,

            riskScore: 0,

            riskLevel: "LOW",

            trustScore: 100
          },

          include: {
            department: true
          }
        });

      db.appendAuditLog({
        userId:
          req.user.id,
        userName:
          req.user.name,
        userEmail:
          req.user.email,
        action:
          "MAIN_ADMIN_CREATE_ADMIN",
        category:
          "ADMIN",
        severity:
          "INFO",
        details: {
          createdAdminId:
            admin.id,
          createdAdminEmail:
            admin.email,
          role:
            admin.roleCode,
          department:
            admin.departmentCode
        }
      });

      return res.status(201).json({
        success: true,
        admin:
          normalizeAdmin(admin),
        message:
          "Administrator created successfully."
      });
    } catch (error) {
      console.error(
        "POST /admins error:",
        error?.message || error
      );

      if (
        error?.code ===
        "P2002"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code:
              "ADMIN_ALREADY_EXISTS",
            message:
              "An account with the supplied unique value already exists."
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code:
            "ADMIN_CREATE_FAILED",
          message:
            "Unable to create administrator."
        }
      });
    }
  }
);

router.patch(
  "/:id",
  requireMainAdmin,
  async (req, res) => {
    try {
      const body = req.body || {};

      const existing =
        await prisma.user.findUnique({
          where: {
            id: req.params.id
          }
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: {
            code:
              "ADMIN_NOT_FOUND",
            message:
              "Administrator not found."
          }
        });
      }

      if (
        !isAdminRole(
          existing.roleCode
        )
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "NOT_AN_ADMIN_ACCOUNT",
            message:
              "This account is not an administrator."
          }
        });
      }

      const updateData = {};

      if (body.name !== undefined) {
        const name =
          String(body.name).trim();

        if (!name) {
          return res.status(400).json({
            success: false,
            error: {
              code:
                "INVALID_ADMIN_NAME",
              message:
                "Administrator name cannot be empty."
            }
          });
        }

        updateData.name = name;
      }

      if (body.email !== undefined) {
        const email =
          String(body.email)
            .trim()
            .toLowerCase();

        if (!email) {
          return res.status(400).json({
            success: false,
            error: {
              code:
                "INVALID_ADMIN_EMAIL",
              message:
                "Administrator email cannot be empty."
            }
          });
        }

        const emailOwner =
          await prisma.user.findUnique({
            where: {
              email
            }
          });

        if (
          emailOwner &&
          emailOwner.id !== existing.id
        ) {
          return res.status(409).json({
            success: false,
            error: {
              code:
                "EMAIL_ALREADY_EXISTS",
              message:
                "A user with this email already exists."
            }
          });
        }

        updateData.email = email;
      }

      if (
        body.department !== undefined ||
        body.departmentCode !== undefined
      ) {
        const departmentCode =
          body.departmentCode ||
          body.department;

        updateData.departmentCode =
          departmentCode;
      }

      if (
        body.role !== undefined ||
        body.roleCode !== undefined
      ) {
        const roleCode =
          body.roleCode ||
          body.role;

        if (!isAdminRole(roleCode)) {
          return res.status(400).json({
            success: false,
            error: {
              code:
                "INVALID_ADMIN_ROLE",
              message:
                "Only administrator roles are allowed."
            }
          });
        }

        if (existing.isMainAdmin) {
          return res.status(403).json({
            success: false,
            error: {
              code:
                "MAIN_ADMIN_PROTECTED",
              message:
                "The main administrator role cannot be changed."
            }
          });
        }

        updateData.roleCode =
          roleCode;
      }

      if (body.status !== undefined) {
        const status =
          body.status;

        if (!isAdminStatus(status)) {
          return res.status(400).json({
            success: false,
            error: {
              code:
                "INVALID_ADMIN_STATUS",
              message:
                "Status must be ACTIVE or DISABLED."
            }
          });
        }

        if (
          existing.isMainAdmin &&
          status !== "ACTIVE"
        ) {
          return res.status(403).json({
            success: false,
            error: {
              code:
                "MAIN_ADMIN_PROTECTED",
              message:
                "The main administrator cannot be disabled."
            }
          });
        }

        updateData.status =
          status;
      }

      if (
        body.password !== undefined
      ) {
        const password =
          String(body.password);

        if (password.length < 8) {
          return res.status(400).json({
            success: false,
            error: {
              code:
                "WEAK_PASSWORD",
              message:
                "Admin password must contain at least 8 characters."
            }
          });
        }

        updateData.passwordHash =
          await bcrypt.hash(
            password,
            12
          );

        updateData.passwordChangedAt =
          new Date();
      }

      if (
        Object.keys(updateData).length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code:
              "NO_UPDATE_DATA",
            message:
              "No administrator changes were provided."
          }
        });
      }

      const updated =
        await prisma.user.update({
          where: {
            id: existing.id
          },
          data: updateData,
          include: {
            department: true
          }
        });

      db.appendAuditLog({
        userId:
          req.user.id,
        userName:
          req.user.name,
        userEmail:
          req.user.email,
        action:
          "MAIN_ADMIN_UPDATE_ADMIN",
        category:
          "ADMIN",
        severity:
          "INFO",
        details: {
          targetAdminId:
            updated.id,
          targetAdminEmail:
            updated.email
        }
      });

      return res.json({
        success: true,
        admin:
          normalizeAdmin(updated),
        message:
          "Administrator updated successfully."
      });
    } catch (error) {
      console.error(
        "PATCH /admins/:id error:",
        error?.message || error
      );

      if (
        error?.code ===
        "P2002"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code:
              "EMAIL_ALREADY_EXISTS",
            message:
              "A user with this email already exists."
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code:
            "ADMIN_UPDATE_FAILED",
          message:
            "Unable to update administrator."
        }
      });
    }
  }
);

router.delete(
  "/:id",
  requireMainAdmin,
  async (req, res) => {
    try {
      const existing =
        await prisma.user.findUnique({
          where: {
            id: req.params.id
          }
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: {
            code:
              "ADMIN_NOT_FOUND",
            message:
              "Administrator not found."
          }
        });
      }

      if (
        !isAdminRole(
          existing.roleCode
        )
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "NOT_AN_ADMIN_ACCOUNT",
            message:
              "This account is not an administrator."
          }
        });
      }

      if (
        existing.isMainAdmin
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "MAIN_ADMIN_DELETE_BLOCKED",
            message:
              "The main administrator account cannot be deleted."
          }
        });
      }

      if (
        existing.id ===
        req.user.id
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "SELF_DELETE_BLOCKED",
            message:
              "You cannot delete your own administrator account."
          }
        });
      }

      await prisma.user.delete({
        where: {
          id: existing.id
        }
      });

      db.users =
        db.users.filter(
          (user) =>
            user.id !== existing.id
        );

      db.appendAuditLog({
        userId:
          req.user.id,
        userName:
          req.user.name,
        userEmail:
          req.user.email,
        action:
          "MAIN_ADMIN_DELETE_ADMIN",
        category:
          "ADMIN",
        severity:
          "HIGH",
        details: {
          deletedAdminId:
            existing.id,
          deletedAdminEmail:
            existing.email
        }
      });

      return res.json({
        success: true,
        message:
          "Administrator deleted successfully."
      });
    } catch (error) {
      console.error(
        "DELETE /admins/:id error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code:
            "ADMIN_DELETE_FAILED",
          message:
            "Unable to delete administrator."
        }
      });
    }
  }
);

export default router;