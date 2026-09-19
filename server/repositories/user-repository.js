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

      return records.map((record) =>
        this.mapToDomain(record)
      );
    } catch (error) {
      console.error(
        "User fetch error:",
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
          devices: true,
          department: true
        }
      });

      return record
        ? this.mapToDomain(record)
        : null;
    } catch (error) {
      console.error(
        "User find error:",
        error?.message || error
      );
      return null;
    }
  }

  async findByEmail(email) {
    try {
      if (!email) {
        return null;
      }

      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const record = await prisma.user.findFirst({
        where: {
          email: normalizedEmail
        },
        include: {
          devices: true,
          department: true
        }
      });

      return record
        ? this.mapToDomain(record)
        : null;
    } catch (error) {
      console.error(
        "User email lookup error:",
        error?.message || error
      );
      return null;
    }
  }

  async create(data) {
    const normalizedEmail =
      String(data.email || "")
        .trim()
        .toLowerCase();

    const normalizedEmployeeId =
      String(data.employeeId || "").trim();

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

    const existingEmail =
      await this.findByEmail(normalizedEmail);

    if (existingEmail) {
      const error = new Error(
        "A user with this email already exists."
      );
      error.code = "EMAIL_ALREADY_EXISTS";
      throw error;
    }

    const existingEmployee =
      await prisma.user.findFirst({
        where: {
          employeeId: normalizedEmployeeId
        }
      });

    if (existingEmployee) {
      const error = new Error(
        "A user with this employee ID already exists."
      );
      error.code = "EMPLOYEE_ID_ALREADY_EXISTS";
      throw error;
    }

    try {
      const record = await prisma.user.create({
        data: {
          id:
            data.id ||
            `user-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          employeeId: normalizedEmployeeId,

          name:
            String(data.name || "").trim(),

          email: normalizedEmail,

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
              : 98,
        },

        include: {
          devices: true,
          department: true
        }
      });

      return this.mapToDomain(record);
    } catch (error) {
      console.error(
        "User creation database error:",
        error?.message || error
      );

      throw error;
    }
  }

  async update(userId, data) {
    try {
      const existing =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { employeeId: userId }
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
          data.role ||
          data.roleCode;
      }

      if (data.status !== undefined) {
        updateData.status =
          data.status;
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
        "User update database error:",
        error?.message || error
      );

      throw error;
    }
  }

  async delete(userId) {
    try {
      const existing =
        await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { employeeId: userId }
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
        "User deletion database error:",
        error?.message || error
      );

      throw error;
    }
  }

  async updateRiskAndTrust(
    userId,
    riskScore,
    trustScore,
    riskLevel
  ) {
    try {
      const record =
        await prisma.user.update({
          where: {
            id: userId
          },

          data: {
            riskScore:
              Number(riskScore),

            trustScore:
              Number(trustScore),

            riskLevel:
              riskLevel
          },

          include: {
            devices: true,
            department: true
          }
        });

      return this.mapToDomain(record);
    } catch (error) {
      console.error(
        "User risk/trust update error:",
        error?.message || error
      );

      throw error;
    }
  }

  async updateStatus(userId, status) {
    try {
      const record =
        await prisma.user.update({
          where: {
            id: userId
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
        "User status update error:",
        error?.message || error
      );

      throw error;
    }
  }

  mapToDomain(record) {
    if (!record) {
      return null;
    }

    return {
      id: record.id,

      employeeId:
        record.employeeId,

      name:
        record.name,

      email:
        record.email,

      roleCode:
        record.roleCode,

      role:
        record.roleCode,

      departmentCode:
        record.departmentCode,

      department:
        record.department?.code ||
        record.departmentCode,

      departmentName:
        record.department?.name ||
        record.departmentCode,

      status:
        record.status,

      currentRiskScore:
        Number(record.riskScore ?? 15),

      currentRiskLevel:
        record.riskLevel || "LOW",

      currentTrustScore:
        Number(record.trustScore ?? 98),

      baseline:
        record.baseline || null,

      createdAt:
        record.createdAt,

      updatedAt:
        record.updatedAt,

      devices:
        record.devices || []
    };
  }
}

export const userRepository =
  new UserRepository();

export { UserRepository };
