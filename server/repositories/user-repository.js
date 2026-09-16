import { prisma } from "../models/prisma.js";

class UserRepository {
  async findAll() {
    try {
      const records = await prisma.user.findMany({
        include: {
          devices: true
        }
      });

      return records.map((record) =>
        this.mapToDomain(record)
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
      const record = await prisma.user.findFirst({
        where: {
          OR: [
            { id },
            { employeeId: id }
          ]
        },
        include: {
          devices: true
        }
      });

      return record
        ? this.mapToDomain(record)
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
      return await prisma.user.findUnique({
        where: {
          email: String(email).trim().toLowerCase()
        }
      });
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
      const existingEmployee = await prisma.user.findFirst({
        where: {
          employeeId: data.employeeId
        }
      });

      if (existingEmployee) {
        throw new Error(
          "Employee ID already exists."
        );
      }

      const existingEmail = await prisma.user.findFirst({
        where: {
          email: String(data.email)
            .trim()
            .toLowerCase()
        }
      });

      if (existingEmail) {
        throw new Error(
          "Email address already exists."
        );
      }

      const record = await prisma.user.create({
        data: {
          id:
            data.id ||
            `user-${Date.now()}`,

          employeeId:
            data.employeeId,

          name:
            data.name,

          email:
            String(data.email)
              .trim()
              .toLowerCase(),

          department:
            data.department,

          roleCode:
            data.role ||
            "EMPLOYEE",

          status:
            data.status ||
            "ACTIVE",

          currentRiskScore:
            Number(data.currentRiskScore ?? 15),

          currentRiskLevel:
            data.currentRiskLevel ||
            "LOW",

          currentTrustScore:
            Number(data.currentTrustScore ?? 98),

          baseline:
            data.baseline ||
            {
              normalWorkHours: {
                start: 8,
                end: 18
              },
              allowedDepartments: [
                data.department
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
        },
        include: {
          devices: true
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
      const existing = await prisma.user.findFirst({
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
        updateData.name = data.name;
      }

      if (data.email !== undefined) {
        updateData.email = String(data.email)
          .trim()
          .toLowerCase();
      }

      if (data.employeeId !== undefined) {
        updateData.employeeId =
          data.employeeId;
      }

      if (data.department !== undefined) {
        updateData.department =
          data.department;
      }

      if (data.role !== undefined) {
        updateData.roleCode =
          data.role;
      }

      if (data.status !== undefined) {
        updateData.status =
          data.status;
      }

      const record = await prisma.user.update({
        where: {
          id: existing.id
        },
        data: updateData,
        include: {
          devices: true
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
      const existing = await prisma.user.findFirst({
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

      return existing;
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

      return await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          currentRiskScore:
            Number(riskScore) || 0,

          currentTrustScore:
            Number(trustScore) || 0,

          currentRiskLevel:
            riskLevel || "LOW"
        }
      });
    } catch (error) {
      console.error(
        "UserRepository.updateRiskAndTrust:",
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

      return await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          status
        }
      });
    } catch (error) {
      console.error(
        "UserRepository.updateStatus:",
        error?.message || error
      );

      return null;
    }
  }

  mapToDomain(record) {
    return {
      id: record.id,

      employeeId:
        record.employeeId,

      name:
        record.name,

      email:
        record.email,

      department:
        record.department,

      role:
        record.roleCode ||
        record.role,

      currentRiskScore:
        record.currentRiskScore ??
        15,

      currentRiskLevel:
        record.currentRiskLevel ??
        "LOW",

      currentTrustScore:
        record.currentTrustScore ??
        95,

      status:
        record.status ||
        "ACTIVE",

      createdAt:
        record.createdAt,

      lastLoginAt:
        record.lastLoginAt,

      activeDeviceId:
        record.activeDeviceId,

      baseline:
        record.baseline
          ? typeof record.baseline === "string"
            ? JSON.parse(record.baseline)
            : record.baseline
          : {
              normalWorkHours: {
                start: 8,
                end: 18
              },
              allowedDepartments: [
                record.department
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
  }
}

export const userRepository =
  new UserRepository();