import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { sseManager } from "../services/sse.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    devices: db.devices
  });
});

router.get("/:id", (req, res) => {
  const device = db.getDeviceById(req.params.id);

  if (!device) {
    return res.status(404).json({
      success: false,
      error: {
        code: "DEVICE_NOT_FOUND",
        message: "Device not found"
      }
    });
  }

  res.json({
    success: true,
    device
  });
});

router.post("/:id/trust", requireSecurityAdmin, (req, res) => {
  const device = db.getDeviceById(req.params.id);

  if (!device) {
    return res.status(404).json({
      success: false,
      error: {
        code: "DEVICE_NOT_FOUND",
        message: "Device not found"
      }
    });
  }

  device.isTrusted = true;
  device.trustScore = 95;
  device.status = "TRUSTED";

  db.appendAuditLog({
    userId: device.userId,
    userName: device.userName,
    action: "DEVICE_TRUST_RESTORED",
    category: "DEVICE",
    severity: "INFO",
    details: {
      deviceId: device.id
    }
  });

  sseManager.broadcastDevice(device);

  res.json({
    success: true,
    device
  });
});

router.post("/:id/revoke", requireSecurityAdmin, (req, res) => {
  const device = db.getDeviceById(req.params.id);

  if (!device) {
    return res.status(404).json({
      success: false,
      error: {
        code: "DEVICE_NOT_FOUND",
        message: "Device not found"
      }
    });
  }

  device.status = "REVOKED";
  device.isTrusted = false;
  device.trustScore = 0;

  if (db.deviceRepository?.revoke) {
    db.deviceRepository.revoke(device.id).catch(() => {});
  }

  sseManager.broadcastDevice(device);

  db.appendAuditLog({
    userId: device.userId,
    userName: device.userName,
    action: "DEVICE_CERTIFICATE_REVOKED",
    category: "DEVICE",
    severity: "CRITICAL",
    details: {
      deviceId: device.id,
      deviceName: device.deviceName
    }
  });

  res.json({
    success: true,
    device,
    message:
      `Device ${device.deviceName} revoked.`
  });
});

export default router;