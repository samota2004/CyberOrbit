import { prisma } from "../models/prisma.js";

class UserRepository {
  async findAll() {
    try {
      const records = await prisma.user.findMany({
        include: {
          devices: true,
          department: true
        }
      });

      return records.map((r) =>
        this.mapToDomain(r)
      );
    } catch (error) {
      console.error(
        "UserRepository.findAll:",
        error?.message || error
      );

      return [];
    }
  }

  async findById(id) {
    try {
      const r = await prisma.user.findFirst({
        where: {
          OR: [
            { id },
            { employeeId: id }
          ]
        },
        include: {
          devices: true,
          department: true
        }
      });

      return r
        ? this.mapToDomain(r)
        : null;
    } catch (error) {
      console.error(
        "UserRepository.findById:",
        error?.message || error
      );

      return null;
    }
  }

  async findByEmail(email) {
    try {
      const normalizedEmail =
        String(email || "")
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return null;
      }

      const r = await prisma.user.findFirst({
        where: {
          email: normalizedEmail
        },
        include: {
          department: true
        }
      });

      return r
        ? this.mapToDomain(r)
        : null;
    } catch (error) {
      console.error(
        "UserRepository.findByEmail:",
        error?.message || error
      );

      return null;
    }
  }

  async create(data) {
    try {
      const employeeId =
        String(data.employeeId || "").trim();

      const email =
        String(data.email || "")
          .trim()
          .toLowerCase();

      const departmentCode =
        data.departmentCode ||
        data.department ||
        "ENGINEERING";

      const roleCode =
        data.roleCode ||
        data.role ||
        "EMPLOYEE";

      const status =
        data.status ||
        "ACTIVE";

      const existingEmployee =
        await prisma.user.findFirst({
          where: {
            employeeId
          }
        });

      if (existingEmployee) {
        const error =
          new Error(
            "A user with this employee ID already exists."
          );

        error.code =
          "EMPLOYEE_ID_ALREADY_EXISTS";

        throw error;
      }

      const existingEmail =
        await prisma.user.findFirst({
          where: {
            email
          }
        });

      if (existingEmail) {
        const error =
          new Error(
            "A user with this email already exists."
          );

        error.code =
          "EMAIL_ALREADY_EXISTS";

        throw error;
      }

      const record =
        await prisma.user.create({
          data: {
            id:
              data.id ||
              `user-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            employeeId,

            name:
              String(data.name || "").trim(),

            email,

            departmentCode,

            roleCode,

            status,

            riskScore:
              Number.isFinite(
                Number(data.currentRiskScore)
              )
                ? Number(data.currentRiskScore)
                : 15,

            riskLevel:
              data.currentRiskLevel ||
              "LOW",

            trustScore:
              Number.isFinite(
                Number(data.currentTrustScore)
              )
                ? Number(data.currentTrustScore)
                : 98
          },

          include: {
            devices: true,
            department: true
          }
        });

      return this.mapToDomain(record);
    } catch (error) {
      console.error(
        "UserRepository.create:",
        error?.message || error
      );

      throw error;
    }
  }

  async update(id, data) {
    try {
      const existing =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id },
              { employeeId: id }
            ]
          }
        });

      if (!existing) {
        return null;
      }

      const updateData = {};

      if (data.name !== undefined) {
        updateData.name =
          String(data.name).trim();
      }

      if (data.email !== undefined) {
        updateData.email =
          String(data.email)
            .trim()
            .toLowerCase();
      }

      if (data.employeeId !== undefined) {
        updateData.employeeId =
          String(data.employeeId).trim();
      }

      if (
        data.department !== undefined ||
        data.departmentCode !== undefined
      ) {
        updateData.departmentCode =
          data.departmentCode ||
          data.department;
      }

      if (
        data.role !== undefined ||
        data.roleCode !== undefined
      ) {
        updateData.roleCode =
          data.roleCode ||
          data.role;
      }

      if (data.status !== undefined) {
        updateData.status =
          data.status;
      }

      if (
        data.currentRiskScore !== undefined ||
        data.riskScore !== undefined
      ) {
        updateData.riskScore =
          Number(
            data.riskScore ??
            data.currentRiskScore
          );
      }

      if (
        data.currentRiskLevel !== undefined ||
        data.riskLevel !== undefined
      ) {
        updateData.riskLevel =
          data.riskLevel ||
          data.currentRiskLevel;
      }

      if (
        data.currentTrustScore !== undefined ||
        data.trustScore !== undefined
      ) {
        updateData.trustScore =
          Number(
            data.trustScore ??
            data.currentTrustScore
          );
      }

      const record =
        await prisma.user.update({
          where: {
            id: existing.id
          },

          data: updateData,

          include: {
            devices: true,
            department: true
          }
        });

      return this.mapToDomain(record);
    } catch (error) {
      console.error(
        "UserRepository.update:",
        error?.message || error
      );

      throw error;
    }
  }

  async delete(id) {
    try {
      const existing =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id },
              { employeeId: id }
            ]
          }
        });

      if (!existing) {
        return null;
      }

      await prisma.user.delete({
        where: {
          id: existing.id
        }
      });

      return {
        id: existing.id,
        employeeId: existing.employeeId
      };
    } catch (error) {
      console.error(
        "UserRepository.delete:",
        error?.message || error
      );

      throw error;
    }
  }

  async recordTrustHistory(
    userId,
    trustScore,
    riskScore,
    reason = "Trust Evaluation",
    delta = 0
  ) {
    try {
      const user =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { employeeId: userId }
            ]
          }
        });

      if (!user) {
        return null;
      }

      return await prisma.trustHistory.create({
        data: {
          userId: user.id,

          trustScore:
            Number(trustScore) || 0,

          riskScore:
            Number(riskScore) || 0,

          reason:
            reason ||
            "Trust score dynamic update",

          delta:
            Number(delta) || 0
        }
      });
    } catch (error) {
      console.error(
        "UserRepository.recordTrustHistory:",
        error?.message || error
      );

      return null;
    }
  }

  async updateRiskAndTrust(
    userId,
    riskScore,
    trustScore,
    riskLevel = "LOW"
  ) {
    try {
      const user =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { employeeId: userId }
            ]
          }
        });

      if (!user) {
        return null;
      }

      const record =
        await prisma.user.update({
          where: {
            id: user.id
          },

          data: {
            riskScore:
              Number(riskScore) || 0,

            trustScore:
              Number(trustScore) || 0,

            riskLevel:
              riskLevel || "LOW"
          },

          include: {
            devices: true,
            department: true
          }
        });

      return this.mapToDomain(record);
    } catch (error) {
      console.warn(
        "Risk/trust database update warning:",
        error?.message || error
      );

      return null;
    }
  }

  async updateStatus(userId, status) {
    try {
      const user =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { employeeId: userId }
            ]
          }
        });

      if (!user) {
        return null;
      }

      const record =
        await prisma.user.update({
          where: {
            id: user.id
          },

          data: {
            status
          },

          include: {
            devices: true,
            department: true
          }
        });

      return this.mapToDomain(record);
    } catch (error) {
      console.error(
        "UserRepository.updateStatus:",
        error?.message || error
      );

      return null;
    }
  }

  mapToDomain(r) {
    if (!r) {
      return null;
    }

    return {
      id:
        r.id,

      employeeId:
        r.employeeId,

      name:
        r.name,

      email:
        r.email,

      departmentCode:
        r.departmentCode,

      department:
        r.department?.code ||
        r.departmentCode,

      departmentName:
        r.department?.name ||
        r.departmentCode,

      roleCode:
        r.roleCode,

      role:
        r.roleCode,

      currentRiskScore:
        Number(r.riskScore ?? 15),

      currentRiskLevel:
        r.riskLevel ||
        "LOW",

      currentTrustScore:
        Number(r.trustScore ?? 98),

      status:
        r.status ||
        "ACTIVE",

      createdAt:
        r.createdAt,

      updatedAt:
        r.updatedAt,

      devices:
        r.devices || []
    };
  }
}

class DeviceRepository {
  async findAll() {
    try {
      const records =
        await prisma.device.findMany();

      return records;
    } catch {
      return [];
    }
  }

  async findById(id) {
    try {
      return await prisma.device.findFirst({
        where: {
          OR: [
            { id },
            { deviceId: id }
          ]
        }
      });
    } catch {
      return null;
    }
  }

  async revoke(id) {
    try {
      const existing =
        await this.findById(id);

      if (!existing) {
        return null;
      }

      return await prisma.device.update({
        where: {
          id: existing.id
        },

        data: {
          status: "REVOKED",
          isTrusted: false
        }
      });
    } catch {
      return null;
    }
  }

  async updateTrustScore(
    id,
    trustScore,
    isTrusted,
    status
  ) {
    try {
      const existing =
        await this.findById(id);

      if (!existing) {
        return null;
      }

      return await prisma.device.update({
        where: {
          id: existing.id
        },

        data: {
          trustScore:
            Number(trustScore) || 0,

          isTrusted:
            typeof isTrusted === "boolean"
              ? isTrusted
              : trustScore >= 60,

          status:
            status ||
            (trustScore >= 60
              ? "TRUSTED"
              : "SUSPICIOUS")
        }
      });
    } catch {
      return null;
    }
  }
}

class ResourceRepository {
  async findAll() {
    try {
      return await prisma.resource.findMany();
    } catch {
      return [];
    }
  }

  async findById(id) {
    try {
      return await prisma.resource.findUnique({
        where: {
          id
        }
      });
    } catch {
      return null;
    }
  }
}

class IncidentRepository {
  async findAll() {
    try {
      return await prisma.incident.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch {
      return [];
    }
  }

  async findById(id) {
    try {
      return await prisma.incident.findFirst({
        where: {
          OR: [
            { id },
            { incidentId: id }
          ]
        }
      });
    } catch {
      return null;
    }
  }

  async create(data) {
    try {
      const incidentId =
        data.id ||
        `INC-${Date.now()
          .toString()
          .slice(-5)}`;

      let resolvedUserId =
        data.userId ||
        "user-001";

      const user =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: data.userId },
              { employeeId: data.userId }
            ]
          }
        });

      if (user) {
        resolvedUserId =
          user.id;
      }

      return await prisma.incident.create({
        data: {
          incidentId,

          title:
            data.title ||
            "Security Incident Alert",

          description:
            data.description ||
            "Automated policy enforcement event",

          severity:
            data.severity ||
            "MEDIUM",

          status:
            data.status ||
            "NEW",

          userId:
            resolvedUserId,

          userEmail:
            data.userEmail ||
            user?.email ||
            "security@enterprise.corp",

          riskScore:
            Number(data.riskScore) || 50,

          contributingFactors:
            Array.isArray(
              data.contributingFactors
            )
              ? data.contributingFactors
              : [],

          mitreTechnique:
            data.mitreTechnique ||
            null,

          aiExplanation:
            data.aiExplanation ||
            null,

          recommendedAction:
            data.recommendedAction ||
            null,

          resolutionNotes:
            data.resolutionNotes ||
            data.analystNotes ||
            null,

          resolvedBy:
            data.resolvedBy ||
            null,

          resolvedAt:
            data.resolvedAt
              ? new Date(data.resolvedAt)
              : null,

          createdAt:
            data.timestamp
              ? new Date(data.timestamp)
              : new Date()
        }
      });
    } catch (error) {
      console.warn(
        "Incident database sync warning:",
        error?.message || error
      );

      return data;
    }
  }

  async resolve(
    id,
    resolutionNotes = "Incident resolved",
    resolvedBy = "Alex Rivera (Security Admin)"
  ) {
    try {
      const existing =
        await this.findById(id);

      if (!existing) {
        return null;
      }

      return await prisma.incident.update({
        where: {
          id: existing.id
        },

        data: {
          status: "RESOLVED",

          resolutionNotes:
            resolutionNotes ||
            "Resolved by security admin",

          resolvedBy,

          resolvedAt:
            new Date()
        }
      });
    } catch {
      return null;
    }
  }

  async updateAiExplanation(
    id,
    explanation
  ) {
    try {
      const existing =
        await this.findById(id);

      if (!existing) {
        return null;
      }

      return await prisma.incident.update({
        where: {
          id: existing.id
        },

        data: {
          aiExplanation:
            explanation
        }
      });
    } catch {
      return null;
    }
  }
}

class AuditLogRepository {
  async findAll(limit = 100) {
    try {
      return await prisma.auditLog.findMany({
        take: limit,

        orderBy: {
          timestamp: "desc"
        }
      });
    } catch {
      return [];
    }
  }

  async create(data) {
    try {
      const normalizedDetails =
        typeof data.details === "string"
          ? data.details
          : JSON.stringify(
              data.details ?? {}
            );

      const normalizedMetadata =
        data.metadata &&
        typeof data.metadata === "object"
          ? data.metadata
          : {};

      return await prisma.auditLog.create({
        data: {
          userId:
            data.userId ||
            "user-001",

          userEmail:
            data.userEmail ||
            "unknown@enterprise.local",

          action:
            data.action ||
            "UNKNOWN_ACTION",

          category:
            data.category ||
            "SYSTEM",

          severity:
            data.severity ||
            "INFO",

          details:
            normalizedDetails,

          ip:
            data.ip ||
            "127.0.0.1",

          metadata:
            normalizedMetadata
        }
      });
    } catch (error) {
      console.warn(
        "Audit log database sync warning:",
        error?.message || error
      );

      return data;
    }
  }
}

class PolicyRepository {
  async getActivePolicy() {
    try {
      const policy =
        await prisma.zeroTrustPolicy.findFirst({
          where: {
            isActive: true
          },

          orderBy: {
            updatedAt: "desc"
          }
        });

      return policy;
    } catch {
      return null;
    }
  }

  async updatePolicy(config) {
    try {
      const existing =
        await prisma.zeroTrustPolicy.findFirst({
          where: {
            isActive: true
          }
        });

      if (existing) {
        return await prisma.zeroTrustPolicy.update({
          where: {
            id: existing.id
          },

          data: {
            lowRiskMax:
              config.lowRiskMax ??
              existing.lowRiskMax,

            mediumRiskMax:
              config.mediumRiskMax ??
              existing.mediumRiskMax,

            highRiskMax:
              config.highRiskMax ??
              existing.highRiskMax,

            veryHighRiskMax:
              config.veryHighRiskMax ??
              existing.veryHighRiskMax,

            criticalThreshold:
              config.criticalThreshold ??
              existing.criticalThreshold,

            mfaThreshold:
              config.mfaThreshold ??
              existing.mfaThreshold,

            approvalThreshold:
              config.approvalThreshold ??
              existing.approvalThreshold,

            restrictionThreshold:
              config.restrictionThreshold ??
              existing.restrictionThreshold
          }
        });
      }

      return await prisma.zeroTrustPolicy.create({
        data: {
          name:
            "Active Enterprise Zero Trust Policy",

          isActive:
            true,

          lowRiskMax:
            config.lowRiskMax ??
            25,

          mediumRiskMax:
            config.mediumRiskMax ??
            50,

          highRiskMax:
            config.highRiskMax ??
            75,

          veryHighRiskMax:
            config.veryHighRiskMax ??
            90,

          criticalThreshold:
            config.criticalThreshold ??
            90,

          mfaThreshold:
            config.mfaThreshold ??
            40,

          approvalThreshold:
            config.approvalThreshold ??
            60,

          restrictionThreshold:
            config.restrictionThreshold ??
            75
        }
      });
    } catch {
      return null;
    }
  }

  async getConfig() {
    return this.getActivePolicy();
  }
}

import { ActivityRepository } from "./activity-repository.js";
import { AccessRequestRepository } from "./access-request-repository.js";

export const userRepository =
  new UserRepository();

export const deviceRepository =
  new DeviceRepository();

export const resourceRepository =
  new ResourceRepository();

export const activityRepository =
  new ActivityRepository();

export const incidentRepository =
  new IncidentRepository();

export const accessRequestRepository =
  new AccessRequestRepository();

export const auditLogRepository =
  new AuditLogRepository();

export const policyRepository =
  new PolicyRepository();
