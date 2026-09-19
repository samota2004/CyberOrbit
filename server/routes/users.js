import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { userRepository } from "../repositories/index.js";
import { trustEngine } from "../../cyber/zero-trust/trust-engine.js";

const router = Router();

function isEmployeeRole(role) {
  return role === "EMPLOYEE" || role === "MANAGER";
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role:
      user.role ||
      user.roleCode ||
      "EMPLOYEE",
    currentRiskScore:
      Number(user.currentRiskScore ?? 15),
    currentRiskLevel:
      user.currentRiskLevel || "LOW",
    currentTrustScore:
      Number(user.currentTrustScore ?? 98),
    status:
      user.status || "ACTIVE"
  };
}

router.get("/", async (req, res) => {
  try {
    if (db.isPostgresConnected) {
      const users =
        await userRepository.findAll();

      const normalizedUsers =
        users.map(normalizeUser);

      db.users = normalizedUsers;

      const employees =
        normalizedUsers.filter((user) =>
          isEmployeeRole(user.roleCode || user.role)
        );

      return res.json({
        success: true,
        users: employees
      });
    }

    return res.json({
      success: true,
      users: db.users
        .map(normalizeUser)
        .filter((user) =>
          isEmployeeRole(user.roleCode || user.role)
        )
    });
  } catch (error) {
    console.error(
      "GET /users error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "USERS_FETCH_FAILED",
        message:
          error?.message ||
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
    }

    if (!user) {
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
          message: "User not found."
        }
      });
    }

    if (
      !isEmployeeRole(
        user.roleCode || user.role
      )
    ) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found."
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

    return res.json({
      success: true,
      user: normalizeUser(user),
      devices: userDevices,
      recentEvents:
        userEvents.slice(0, 15),
      incidents: userIncidents,
      trustHistory
    });
  } catch (error) {
    console.error(
      "GET /users/:id error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "USER_FETCH_FAILED",
        message:
          error?.message ||
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
      const body = req.body || {};

      const name =
        String(body.name || "").trim();

      const email =
        String(body.email || "")
          .trim()
          .toLowerCase();

      const employeeId =
        String(body.employeeId || "").trim();

      const department =
        body.department ||
        "ENGINEERING";

      const role =
        "EMPLOYEE";

      const status =
        body.status ||
        "ACTIVE";

      if (
        !name ||
        !email ||
        !employeeId
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_USER_DATA",
            message:
              "Name, email, and employee ID are required."
          }
        });
      }

      const existingByEmail =
        db.getUserByEmail(email);

      const existingByEmployeeId =
        db.getUserById(employeeId);

      if (
        existingByEmail ||
        existingByEmployeeId
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code:
              existingByEmail
                ? "EMAIL_ALREADY_EXISTS"
                : "EMPLOYEE_ID_ALREADY_EXISTS",
            message:
              existingByEmail
                ? "A user with this email already exists."
                : "A user with this employee ID already exists."
          }
        });
      }

      const userData = {
        name,
        email,
        employeeId,
        department,
        role,
        status,
        currentRiskScore: 15,
        currentRiskLevel: "LOW",
        currentTrustScore: 98
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

      if (!createdUser) {
        throw new Error(
          "User creation returned no user."
        );
      }

      const normalizedUser =
        normalizeUser(createdUser);

      const existingIndex =
        db.users.findIndex(
          (user) =>
            user.id ===
            normalizedUser.id
        );

      if (existingIndex === -1) {
        db.users.unshift(
          normalizedUser
        );
      } else {
        db.users[existingIndex] =
          normalizedUser;
      }

      db.appendAuditLog({
        userId:
          normalizedUser.id,
        userName:
          normalizedUser.name,
        userEmail:
          normalizedUser.email,
        action:
          "ADMIN_CREATE_USER",
        category:
          "ADMIN",
        severity:
          "INFO",
        details: {
          employeeId:
            normalizedUser.employeeId,
          department:
            normalizedUser.department,
          role:
            normalizedUser.role,
          message:
            "Employee account created."
        }
      });

      return res.status(201).json({
        success: true,
        user: normalizedUser,
        message:
          "Employee created successfully."
      });
    } catch (error) {
      console.error(
        "POST /users error:",
        error?.message || error
      );

      if (
        error?.code ===
        "EMAIL_ALREADY_EXISTS"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      if (
        error?.code ===
        "EMPLOYEE_ID_ALREADY_EXISTS"
      ) {
        return res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: "USER_CREATE_FAILED",
          message:
            error?.message ||
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
      const body = req.body || {};

      let existingUser =
        db.getUserById(
          req.params.id
        );

      if (
        !existingUser &&
        db.isPostgresConnected
      ) {
        existingUser =
          await userRepository.findById(
            req.params.id
          );
      }

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message:
              "User not found."
          }
        });
      }

      if (
        !isEmployeeRole(
          existingUser.roleCode ||
          existingUser.role
        )
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "ADMIN_MANAGEMENT_SEPARATED",
            message:
              "Administrator accounts must be managed through the Admin Dashboard."
          }
        });
      }

      const updateData = {};

      if (body.name !== undefined) {
        updateData.name =
          String(body.name).trim();
      }

      if (body.email !== undefined) {
        updateData.email =
          String(body.email)
            .trim()
            .toLowerCase();
      }

      if (
        body.employeeId !== undefined
      ) {
        updateData.employeeId =
          String(
            body.employeeId
          ).trim();
      }

      if (
        body.department !== undefined
      ) {
        updateData.departmentCode =
          body.department;
      }

      if (body.status !== undefined) {
        updateData.status =
          body.status;
      }

      let updatedUser;

      if (db.isPostgresConnected) {
        updatedUser =
          await userRepository.update(
            existingUser.id,
            updateData
          );
      } else {
        if (
          updateData.departmentCode !==
          undefined
        ) {
          existingUser.department =
            updateData.departmentCode;

          existingUser.departmentCode =
            updateData.departmentCode;
        }

        if (
          updateData.name !==
          undefined
        ) {
          existingUser.name =
            updateData.name;
        }

        if (
          updateData.email !==
          undefined
        ) {
          existingUser.email =
            updateData.email;
        }

        if (
          updateData.employeeId !==
          undefined
        ) {
          existingUser.employeeId =
            updateData.employeeId;
        }

        if (
          updateData.status !==
          undefined
        ) {
          existingUser.status =
            updateData.status;
        }

        updatedUser =
          existingUser;
      }

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message:
              "User not found."
          }
        });
      }

      const normalizedUser =
        normalizeUser(
          updatedUser
        );

      const localIndex =
        db.users.findIndex(
          (user) =>
            user.id ===
            normalizedUser.id
        );

      if (localIndex === -1) {
        db.users.unshift(
          normalizedUser
        );
      } else {
        db.users[localIndex] =
          normalizedUser;
      }

      db.appendAuditLog({
        userId:
          normalizedUser.id,
        userName:
          normalizedUser.name,
        userEmail:
          normalizedUser.email,
        action:
          "ADMIN_UPDATE_USER",
        category:
          "ADMIN",
        severity:
          "INFO",
        details: {
          message:
            "Employee account updated."
        }
      });

      return res.json({
        success: true,
        user: normalizedUser,
        message:
          "Employee updated successfully."
      });
    } catch (error) {
      console.error(
        "PATCH /users/:id error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "USER_UPDATE_FAILED",
          message:
            error?.message ||
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
      let user =
        db.getUserById(
          req.params.id
        );

      if (
        !user &&
        db.isPostgresConnected
      ) {
        user =
          await userRepository.findById(
            req.params.id
          );
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message:
              "User not found."
          }
        });
      }

      if (
        !isEmployeeRole(
          user.roleCode || user.role
        )
      ) {
        return res.status(403).json({
          success: false,
          error: {
            code:
              "ADMIN_MANAGEMENT_SEPARATED",
            message:
              "Administrator accounts must be managed through the Admin Dashboard."
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
        userId:
          user.id,
        userName:
          user.name,
        userEmail:
          user.email,
        action:
          "ADMIN_DELETE_USER",
        category:
          "ADMIN",
        severity:
          "HIGH",
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
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code:
            "USER_DELETE_FAILED",
          message:
            error?.message ||
            "Unable to delete user."
        }
      });
    }
  }
);

router.post(
  "/:id/freeze",
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
            code:
              "USER_NOT_FOUND",
            message:
              "User not found"
          }
        });
      }

      const result =
        await trustEngine.freezeUser(
          user.id,
          "Security administrator initiated freeze"
        );

      db.updateUserStatus(
        user.id,
        "FROZEN"
      );

      return res.json({
        success: true,
        user:
          db.getUserById(
            user.id
          ),
        result
      });
    } catch (error) {
      console.error(
        "Freeze user error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code:
            "USER_FREEZE_ERROR",
          message:
            error?.message ||
            "Unable to freeze user."
        }
      });
    }
  }
);

router.post(
  "/:id/unfreeze",
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
            code:
              "USER_NOT_FOUND",
            message:
              "User not found"
          }
        });
      }

      const result =
        await trustEngine.unfreezeUser(
          user.id,
          "Security administrator restored account"
        );

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

      return res.json({
        success: true,
        user:
          db.getUserById(
            user.id
          ),
        result
      });
    } catch (error) {
      console.error(
        "Unfreeze user error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code:
            "USER_UNFREEZE_ERROR",
          message:
            error?.message ||
            "Unable to unfreeze user."
        }
      });
    }
  }
);

router.post(
  "/:id/reset-risk",
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
            code:
              "USER_NOT_FOUND",
            message:
              "User not found"
          }
        });
      }

      user.currentRiskScore =
        15;

      user.currentRiskLevel =
        "LOW";

      user.currentTrustScore =
        98;

      if (db.isPostgresConnected) {
        await userRepository.updateRiskAndTrust(
          user.id,
          15,
          98,
          "LOW"
        );
      }

      return res.json({
        success: true,
        user,
        message:
          "Risk profile reset successfully."
      });
    } catch (error) {
      console.error(
        "Reset risk error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code:
            "USER_RESET_RISK_ERROR",
          message:
            error?.message ||
            "Unable to reset user risk."
        }
      });
    }
  }
);

export default router;
