import { prisma } from '../models/prisma.js';
class AccessRequestRepository {
  async findAll() {
    const records = await prisma.accessRequest.findMany({
      include: {
        resource: true,
        user: true
      },
      orderBy: { createdAt: "desc" }
    });
    return records.map((r) => this.mapToDomain(r));
  }
  async findById(id) {
    const record = await prisma.accessRequest.findFirst({
      where: {
        OR: [{ id }, { requestId: id }]
      },
      include: {
        resource: true,
        user: true
      }
    });
    return record ? this.mapToDomain(record) : null;
  }
  async create(req) {
    const requestId = req.id || `REQ-${Date.now().toString().slice(-5)}`;
    let resolvedUserId = req.userId || "user-001";
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.userId }, { employeeId: req.userId }] }
    });
    if (user) resolvedUserId = user.id;
    let resolvedResourceId = req.resourceId || "res-hr-01";
    const resource = await prisma.resource.findFirst({
      where: { OR: [{ id: req.resourceId }, { resourceId: req.resourceId }] }
    });
    if (resource) resolvedResourceId = resource.id;
    const record = await prisma.accessRequest.create({
      data: {
        requestId,
        userId: resolvedUserId,
        resourceId: resolvedResourceId,
        justification: req.reason || "Operational access requirement",
        status: req.status || "PENDING",
        riskAtRequest: req.riskScoreAtRequest || 0,
        aiRiskAssessment: req.aiRiskAssessment,
        createdAt: req.requestedAt ? new Date(req.requestedAt) : /* @__PURE__ */ new Date()
      },
      include: {
        resource: true,
        user: true
      }
    });
    return this.mapToDomain(record);
  }
  async decide(id, status, reviewerId, reason) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await prisma.accessRequest.updateMany({
      where: { OR: [{ id }, { requestId: id }] },
      data: {
        status,
        reviewedBy: reviewerId,
        decisionReason: reason,
        decisionTimestamp: /* @__PURE__ */ new Date()
      }
    });
    return this.findById(id);
  }
  mapToDomain(r) {
    return {
      id: r.requestId || r.id,
      userId: r.userId,
      userName: r.user?.name || "Enterprise User",
      userDepartment: r.user?.departmentCode || "IT",
      resourceId: r.resource?.resourceId || r.resourceId,
      resourceName: r.resource?.name || "Protected Resource",
      resourceDepartment: r.resource?.departmentCode || "IT",
      resourceSensitivity: r.resource?.sensitivity || "CONFIDENTIAL",
      reason: r.justification || "",
      requestedAt: r.createdAt?.toISOString?.() ?? (/* @__PURE__ */ new Date()).toISOString(),
      riskScoreAtRequest: r.riskAtRequest ?? 50,
      aiRiskAssessment: r.aiRiskAssessment || "",
      status: r.status || "PENDING",
      reviewedBy: r.reviewedBy ?? void 0,
      reviewedAt: r.decisionTimestamp?.toISOString?.() ?? void 0,
      reviewNotes: r.decisionReason ?? void 0
    };
  }
}
export {
  AccessRequestRepository
};
