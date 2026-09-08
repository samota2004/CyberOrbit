export class TelemetryNormalizer {
  static normalize(raw = {}) {
    const now = new Date();
    const eventTime = raw.timestamp ? new Date(raw.timestamp) : now;
    const hour = eventTime.getHours();

    const isOffHours = raw.is_off_hours !== undefined 
      ? Boolean(raw.is_off_hours)
      : (raw.isOffHours !== undefined ? Boolean(raw.isOffHours) : (hour < 7 || hour > 20));

    const bytesSent = Number(raw.bytes_sent_kb || raw.bytesSentKB || raw.uploadBytes || 0);
    const bytesRecv = Number(raw.bytes_received_kb || raw.bytesReceivedKB || raw.downloadBytes || 0);
    const downloadMB = raw.downloadVolumeMB || Math.round(bytesRecv / 1024);

    return {
      eventId: raw.eventId || raw.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: raw.userId || raw.user_id || raw.employeeId || 'user-001',
      userDepartment: raw.user_department || raw.department || raw.userDepartment || 'ENGINEERING',
      eventType: raw.eventType || raw.event_type || raw.type || 'DATA_ACCESS',
      resourceId: raw.resourceId || raw.resource_id,
      resourceName: raw.resourceName || raw.resource_name,
      resourceDepartment: raw.resourceDepartment || raw.resource_department,
      resourceSensitivity: raw.resourceSensitivity || raw.resource_sensitivity || 'INTERNAL',
      deviceId: raw.deviceId || raw.device_id,
      deviceName: raw.deviceName || raw.device_name || 'Managed Endpoint',
      deviceTrustScore: Number(raw.deviceTrustScore || raw.device_trust || 85),
      isUnknownDevice: Boolean(raw.isUnknownDevice || raw.is_unknown_device || false),
      ipAddress: raw.ipAddress || raw.ip || '10.0.4.12',
      location: raw.location || 'HQ - Local Network',
      severity: raw.severity || 'LOW',
      failedAuthCount: Number(raw.failed_login_attempts || raw.failedAuthCount || 0),
      isOffHours,
      isUsbTransfer: Boolean(raw.usb_bluetooth_usage || raw.isUsbTransfer || false),
      isPrivilegeEscalation: Boolean(raw.is_privilege_escalation || raw.isPrivilegeEscalation || false),
      bytesSentKB: bytesSent,
      bytesReceivedKB: bytesRecv,
      downloadVolumeMB: downloadMB,
      destinationSite: raw.destination_site || raw.destinationSite || 'internal.local',
      applicationShellCmd: raw.application_shell_cmd || raw.applicationShellCmd || 'standard-agent',
      timestamp: eventTime.toISOString()
    };
  }
}
