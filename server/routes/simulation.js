import { Router } from "express";
import { db } from "../models/db.js";
import { sseManager } from "../services/sse.js";

const router = Router();

const SCENARIOS = {
  "scenario-1-normal": {
    name: "Scenario 1: Baseline Normal Access",
    eventType: "FILE_ACCESS",
    severity: "LOW",
    defaults: {
      deviceTrustScore: 92,
      isUnknownDevice: false,
      location: "Corporate HQ",
      ipAddress: "10.240.14.92",
      isOffHours: false,
      isUsbTransfer: false,
      isPrivilegeEscalation: false,
      metadata: {
        downloadSizeMB: 14,
        fileCount: 5,
        crossDepartment: false
      }
    }
  },

  "scenario-2-suspicious-login": {
    name: "Scenario 2: Suspicious Off-Hours Login",
    eventType: "LOGIN",
    severity: "MEDIUM",
    defaults: {
      deviceTrustScore: 35,
      isUnknownDevice: true,
      location: "Bucharest VPN",
      ipAddress: "185.220.101.44",
      isOffHours: true,
      isUsbTransfer: false,
      isPrivilegeEscalation: false,
      metadata: {
        offHours: true,
        isOffHours: true,
        failedLoginAttempts: 3,
        crossDepartment: false
      }
    }
  },

  "scenario-3-insider-exfiltration": {
    name: "Scenario 3: Cross-Department Exfiltration",
    eventType: "FILE_DOWNLOAD",
    severity: "HIGH",
    defaults: {
      deviceTrustScore: 70,
      isUnknownDevice: false,
      location: "Corporate HQ",
      ipAddress: "10.240.14.92",
      isOffHours: true,
      isUsbTransfer: false,
      isPrivilegeEscalation: false,
      metadata: {
        downloadSizeMB: 480,
        fileSizeMB: 480,
        fileCount: 500,
        crossDepartment: true,
        offHours: true,
        isOffHours: true
      }
    }
  },

  "scenario-4-critical-compromise": {
    name: "Scenario 4: Critical Account Compromise & Auto-Freeze",
    eventType: "LOGIN_FAILED",
    severity: "CRITICAL",
    defaults: {
      deviceTrustScore: 20,
      isUnknownDevice: true,
      location: "Unknown External Network",
      ipAddress: "45.141.87.21",
      isOffHours: true,
      isUsbTransfer: true,
      isPrivilegeEscalation: true,
      metadata: {
        failedLoginAttempts: 4,
        offHours: true,
        isOffHours: true,
        privilegeEscalation: true,
        usbTransfer: true,
        crossDepartment: true,
        downloadSizeMB: 1840,
        fileSizeMB: 1840,
        fileCount: 1800
      }
    }
  },

  "scenario-5-privilege-escalation": {
    name: "Scenario 5: Privilege Escalation Attack",
    eventType: "PRIVILEGE_ELEVATION",
    severity: "HIGH",
    defaults: {
      deviceTrustScore: 65,
      isUnknownDevice: false,
      location: "Corporate HQ",
      ipAddress: "10.240.14.92",
      isOffHours: false,
      isUsbTransfer: false,
      isPrivilegeEscalation: true,
      metadata: {
        privilegeEscalation: true,
        command: "sudo escalation attempt",
        targetRole: "SYSTEM_ADMIN"
      }
    }
  },

  "scenario-6-usb-exfiltration": {
    name: "Scenario 6: USB Storage Physical Exfiltration",
    eventType: "USB_ACTIVITY",
    severity: "HIGH",
    defaults: {
      deviceTrustScore: 45,
      isUnknownDevice: false,
      location: "Corporate HQ",
      ipAddress: "10.240.14.92",
      isOffHours: false,
      isUsbTransfer: true,
      isPrivilegeEscalation: false,
      metadata: {
        usbTransfer: true,
        downloadSizeMB: 620,
        fileSizeMB: 620,
        fileCount: 620,
        removableMedia: true,
        approvedDevice: false,
        crossDepartment: true
      }
    }
  },

  "scenario-7-large-scale-exfiltration": {
    name: "Scenario 7: Large-Scale High-Velocity Exfiltration",
    eventType: "FILE_DOWNLOAD",
    severity: "CRITICAL",
    defaults: {
      deviceTrustScore: 25,
      isUnknownDevice: true,
      location: "Frankfurt External Network",
      ipAddress: "91.198.174.21",
      isOffHours: true,
      isUsbTransfer: false,
      isPrivilegeEscalation: false,
      metadata: {
        downloadSizeMB: 2850,
        fileSizeMB: 2850,
        fileCount: 3400,
        massDownload: true,
        highVelocity: true,
        crossDepartment: true,
        offHours: true,
        isOffHours: true,
        destinationSite: "unauthorized-cloud.example",
        transferTool: "rclone"
      }
    }
  },

  "scenario-8-compromised-endpoint": {
    name: "Scenario 8: Compromised Endpoint & C2 Beaconing",
    eventType: "SHELL_EXECUTION",
    severity: "CRITICAL",
    defaults: {
      deviceTrustScore: 15,
      isUnknownDevice: true,
      location: "Unknown External Network",
      ipAddress: "103.86.96.44",
      isOffHours: true,
      isUsbTransfer: false,
      isPrivilegeEscalation: false,
      metadata: {
        failedLoginAttempts: 5,
        offHours: true,
        isOffHours: true,
        c2Beaconing: true,
        beaconIntervalSeconds: 30,
        destinationSite: "foreign-proxy.example",
        shellCommand: "automated-beacon-process",
        crossDepartment: true
      }
    }
  }
};

router.post(
  "/scenario/:scenarioId",
  async (req, res) => {
    try {
      const { scenarioId } = req.params;
      const body = req.body || {};

      const scenario = SCENARIOS[scenarioId];

      if (!scenario) {
        return res.status(400).json({
          success: false,
          error: {
            code: "UNKNOWN_SCENARIO",
            message: `Unknown scenario: ${scenarioId}`
          }
        });
      }

      const targetUser =
        db.getUserById(body.userId) ||
        db.users.find(
          (user) =>
            user.status === "ACTIVE"
        );

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "No active user available."
          }
        });
      }

      const normalDevice =
        db.getDeviceById(
          body.deviceId ||
          targetUser.activeDeviceId ||
          "dev-hr-01"
        );

      const resource =
        db.getResourceById(
          body.resourceId ||
          "res-hr-01"
        );

      const defaults = scenario.defaults;

      const eventId =
        `evt-${scenarioId}-${Date.now()}`;

      const event = {
        id: eventId,

        eventId,

        userId:
          targetUser.id,

        userEmail:
          targetUser.email,

        userName:
          targetUser.name,

        userDepartment:
          targetUser.department,

        timestamp:
          body.timestamp ||
          new Date().toISOString(),

        eventType:
          body.eventType ||
          scenario.eventType,

        resourceId:
          resource?.id ||
          body.resourceId,

        resourceName:
          resource?.name ||
          body.resourceName,

        resourceDepartment:
          resource?.department ||
          body.resourceDepartment,

        resourceSensitivity:
          resource?.sensitivity ||
          body.resourceSensitivity,

        deviceId:
          normalDevice?.id ||
          body.deviceId,

        deviceName:
          normalDevice?.deviceName ||
          normalDevice?.name ||
          "Corporate Workstation",

        deviceTrustScore:
          body.deviceTrustScore ??
          defaults.deviceTrustScore,

        isUnknownDevice:
          body.isUnknownDevice ??
          defaults.isUnknownDevice,

        ipAddress:
          body.ipAddress ||
          defaults.ipAddress,

        location:
          body.location ||
          defaults.location,

        severity:
          body.severity ||
          scenario.severity,

        isOffHours:
          body.isOffHours ??
          defaults.isOffHours ??
          false,

        isUsbTransfer:
          body.isUsbTransfer ??
          defaults.isUsbTransfer ??
          false,

        isPrivilegeEscalation:
          body.isPrivilegeEscalation ??
          defaults.isPrivilegeEscalation ??
          false,

        destinationSite:
          body.destinationSite ||
          defaults.metadata?.destinationSite ||
          "internal.local",

        applicationShellCmd:
          body.applicationShellCmd ||
          defaults.metadata?.shellCommand ||
          "standard-agent",

        metadata: {
          ...defaults.metadata,
          ...(body.metadata || {})
        }
      };

      const telemetryResponse =
        await fetch(
          `${req.protocol}://${req.get(
            "host"
          )}/api/telemetry/ingest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(event)
          }
        );

      const telemetryResult =
        await telemetryResponse.json();

      if (!telemetryResponse.ok) {
        return res.status(
          telemetryResponse.status
        ).json(
          telemetryResult
        );
      }

      sseManager.broadcastSimulation(
        scenario.name,
        {
          event:
            telemetryResult.event,

          decision:
            telemetryResult.decision,

          ml:
            telemetryResult.ml,

          features:
            telemetryResult.features,

          user:
            targetUser
        }
      );

      return res.json({
        success: true,

        scenario:
          scenario.name,

        event:
          telemetryResult.event,

        decision:
          telemetryResult.decision,

        ml:
          telemetryResult.ml,

        features:
          telemetryResult.features,

        user:
          targetUser
      });
    } catch (error) {
      console.error(
        "Simulation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "SIMULATION_ERROR",
          message:
            error.message ||
            "Unable to run simulation."
        }
      });
    }
  }
);

export default router;