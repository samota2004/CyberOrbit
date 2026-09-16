import { Router } from "express";
import { db } from "../middleware/auth.js";
import { userRepository } from "../repositories/index.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { trustEngine } from "../../cyber/zero-trust/trust-engine.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    if (db.isPostgresConnected) {
      const users =
        await userRepository.findAll();

      db.users = users;

      return res.json({
        success: true,
        users
      });
    }

    return res.json({
      success: true,
      users: db.users
    });
  } catch (error) {
    console.error(
      "GET /users error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "USERS_FETCH_FAILED",
        message:
          error.message ||
          "Unable to fetch users."
      }
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    let user;

    if (db.isPostgresConnected) {
      user =
        await userRepository.findById(
          req.params.id
        );
    } else {
      user =
        db.getUserById(
          req.params.id
        );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    const userDevices =
      db.devices.filter(
        (device) =>
          device.userId === user.id
      );

    const userEvents =
      db.activityEvents.filter(
        (event) =>
          event.userId === user.id
      );

    const userIncidents =
      db.incidents.filter(
        (incident) =>
          incident.userId === user.id
      );

    const trustHistory =
      db.getTrustHistory(user.id);

    res.json({
      success: true,
      user,
      devices: userDevices,
      recentEvents:
        userEvents.slice(0, 15),
      incidents: userIncidents,
      trustHistory
    });
  } catch (error) {
    console.error(
      "GET /users/:id error:",
      error
    );

    res.status(500).json({
      success: false,
      error: {
        code: "USER_FETCH_FAILED",
        message:
          error.message ||
          "Unable to fetch user."
      }
    });
  }
});

router.post(
  "/",
  requireSecurityAdmin,
  async (req, res) => {
    try {
      const {
        name,
        email,
        employeeId,
        department,
        role,
        status
      } = req.body;

      if (
        !name ||
        !email ||
        !employeeId ||
        !department ||
        !role
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_USER_DATA",
            message:
              "Name, email, employee ID, department, and role are required."
          }
        });
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      if (db.getUserByEmail(normalizedEmail)) {
        return res.status(409).json({
          success: false,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message:
              "A user with this email already exists."
          }
        });
      }

      if (
        db.getUserById(employeeId)
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code: "EMPLOYEE_ID_ALREADY_EXISTS",
            message:
              "A user with this employee ID already exists."
          }
        });
      }

      const userData = {
        name: String(name).trim(),
        email: normalizedEmail,
        employeeId: String(employeeId).trim(),
        department,
        role,
        status: status || "ACTIVE",
        currentRiskScore: 15,
        currentRiskLevel: "LOW",
        currentTrustScore: 98,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        activeDeviceId: null,
        baseline: {
          normalWorkHours: {
            start: 8,
            end: 18
          },
          allowedDepartments: [
            department
          ],
          typicalLocations: [
            "HQ"
          ],
          maxDownloadVolumeMB: 500,
          normalAccessDays: [
            1,
            2,
            3,
            4,
            5
          ]
        }
      };

      let createdUser;

      if (db.isPostgresConnected) {
        createdUser =
          await userRepository.create(
            userData
          );
      } else {
        createdUser = {
          id:
            `user-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          ...userData
        };
      }

      const existingIndex =
        db.users.findIndex(
          (user) =>
            user.id === createdUser.id
        );

      if (existingIndex === -1) {
        db.users.push(createdUser);
      } else {
        db.users[existingIndex] =
          createdUser;
      }

      db.appendAuditLog({
        userId: createdUser.id,
        userName: createdUser.name,
        userEmail: createdUser.email,
        action: "ADMIN_CREATE_USER",
        category: "ADMIN",
        severity: "INFO",
        details: {
          employeeId:
            createdUser.employeeId,
          department:
            createdUser.department,
          role:
            createdUser.role,
          message:
            "Employee account created."
        }
      });

      return res.status(201).json({
        success: true,
        user: createdUser,
        message:
          "Employee created successfully."
      });
    } catch (error) {
      console.error(
        "POST /users error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "USER_CREATE_FAILED",
          message:
            error.message ||
            "Unable to create employee."
        }
      });
    }
  }
);

router.patch(
  "/:id",
  requireSecurityAdmin,
  async (req, res) => {
    try {
      const existingUser =
        db.getUserById(
          req.params.id
        );

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found"
          }
        });
      }

      const {
        name,
        email,
        employeeId,
        department,
        role,
        status
      } = req.body;

      const updateData = {};

      if (name !== undefined) {
        updateData.name =
          String(name).trim();
      }

      if (email !== undefined) {
        updateData.email =
          String(email)
            .trim()
            .toLowerCase();
      }

      if (employeeId !== undefined) {
        updateData.employeeId =
          String(employeeId).trim();
      }

      if (department !== undefined) {
        updateData.department =
          department;
      }

      if (role !== undefined) {
        updateData.role =
          role;
      }

      if (status !== undefined) {
        updateData.status =
          status;
      }

      let updatedUser;

      if (db.isPostgresConnected) {
        updatedUser =
          await userRepository.update(
            existingUser.id,
            updateData
          );
      } else {
        Object.assign(
          existingUser,
          updateData
        );

        updatedUser =
          existingUser;
      }

      const index =
        db.users.findIndex(
          (user) =>
            user.id ===
            existingUser.id
        );

      if (index !== -1) {
        db.users[index] =
          updatedUser;
      }

      db.appendAuditLog({
        userId:
          updatedUser.id,
        userName:
          updatedUser.name,
        userEmail:
          updatedUser.email,
        action:
          "ADMIN_UPDATE_USER",
        category: "ADMIN",
        severity: "INFO",
        details: {
          message:
            "Employee account updated."
        }
      });

      return res.json({
        success: true,
        user: updatedUser,
        message:
          "Employee updated successfully."
      });
    } catch (error) {
      console.error(
        "PATCH /users/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "USER_UPDATE_FAILED",
          message:
            error.message ||
            "Unable to update employee."
        }
      });
    }
  }
);

router.delete(
  "/:id",
  requireSecurityAdmin,
  async (req, res) => {
    try {
      const user =
        db.getUserById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found"
          }
        });
      }

      if (
        user.role ===
          "SECURITY_ADMIN" ||
        user.role ===
          "SYSTEM_ADMIN"
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code: "ADMIN_DELETE_BLOCKED",
            message:
              "Administrator accounts cannot be deleted from employee management."
          }
        });
      }

      if (db.isPostgresConnected) {
        await userRepository.delete(
          user.id
        );
      }

      db.users =
        db.users.filter(
          (item) =>
            item.id !== user.id
        );

      delete db.trustHistories[
        user.id
      ];

      db.appendAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: "ADMIN_DELETE_USER",
        category: "ADMIN",
        severity: "HIGH",
        details: {
          employeeId:
            user.employeeId,
          message:
            "Employee account deleted."
        }
      });

      return res.json({
        success: true,
        message:
          `Employee ${user.employeeId} deleted successfully.`
      });
    } catch (error) {
      console.error(
        "DELETE /users/:id error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "USER_DELETE_FAILED",
          message:
            error.message ||
            "Unable to delete employee."
        }
      });
    }
  }
);

router.post(
  "/:id/freeze",
  requireSecurityAdmin,
  (req, res) => {
    const user =
      db.getUserById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    db.updateUserStatus(
      user.id,
      "FROZEN"
    );

    db.appendAuditLog({
      userId: user.id,
      userName: user.name,
      action:
        "ADMIN_FREEZE_ACCOUNT",
      category: "ADMIN",
      severity: "CRITICAL",
      details: {
        admin:
          req.user?.name ||
          "Security Administrator",
        reason:
          req.body.reason ||
          "Manual SOC containment lock"
      }
    });

    res.json({
      success: true,
      user,
      message:
        `Account ${user.employeeId} (${user.name}) frozen.`
    });
  }
);

router.post(
  "/:id/unfreeze",
  requireSecurityAdmin,
  (req, res) => {
    const user =
      db.getUserById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    db.updateUserStatus(
      user.id,
      "ACTIVE"
    );

    db.updateUserRiskAndTrust(
      user.id,
      20,
      88,
      "LOW"
    );

    db.appendAuditLog({
      userId: user.id,
      userName: user.name,
      action:
        "ADMIN_RESTORE_ACCOUNT",
      category: "ADMIN",
      severity: "INFO",
      details: {
        admin:
          req.user?.name ||
          "Security Administrator",
        note:
          "Account restored and baseline recalibrated."
      }
    });

    trustEngine.updateTrustScore(
      user,
      {
        userId: user.id,
        riskScore: 20,
        riskLevel: "LOW",
        trustScore: 88,
        contributingFactors: [],
        recommendedAction: "ALLOW",
        policyEnforced: "ALLOW",
        mlAnomalyScore: 0.05,
        isCrossDepartment: false,
        isOffHours: false,
        isUnknownDevice: false,
        explanationText:
          "Account access restored by administrator.",
        timestamp:
          new Date().toISOString()
      },
      "Administrative Account Unfreeze & Baseline Reset"
    );

    res.json({
      success: true,
      user,
      message:
        `Account ${user.employeeId} restored to active status.`
    });
  }
);

router.post(
  "/:id/reset-risk",
  requireSecurityAdmin,
  (req, res) => {
    const user =
      db.getUserById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
    }

    db.updateUserRiskAndTrust(
      user.id,
      0,
      100,
      "LOW"
    );

    res.json({
      success: true,
      user:
        db.getUserById(
          user.id
        ),
      message:
        "Risk profile reset successfully."
    });
  }
);

export default router;