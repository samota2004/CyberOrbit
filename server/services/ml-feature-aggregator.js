const SOURCE_TYPES = {
  LOGON: "logon",
  LOGIN: "logon",
  AUTHENTICATION: "logon",
  DEVICE: "device",
  USB_ACTIVITY: "device",
  FILE_ACCESS: "file",
  FILE_DOWNLOAD: "file",
  DATA_ACCESS: "file",
  HTTP: "http",
  WEB_ACCESS: "http",
  SHELL_EXECUTION: "http",
  EMAIL: "email"
};

function getSourceType(event) {
  const type = String(
    event.eventType || ""
  ).toUpperCase();

  return SOURCE_TYPES[type] || "file";
}

function getEventDate(event) {
  const date = new Date(event.timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function createEmptyFeatures(date) {
  return {
    logon_count: 0,
    device_event_count: 0,
    file_event_count: 0,
    http_event_count: 0,
    email_event_count: 0,
    day_of_week: new Date(`${date}T00:00:00Z`).getUTCDay(),
    is_weekend: 0,
    logon_unique_pc_count: 0,
    device_unique_pc_count: 0,
    file_unique_pc_count: 0,
    http_unique_pc_count: 0,
    email_unique_pc_count: 0,
    unique_files: 0,
    file_content_events: 0,
    unique_urls: 0,
    unique_http_content: 0,
    unique_recipients: 0,
    email_size_total: 0,
    attachments_total: 0,
    total_activity: 0,
    cross_source_activity: 0
  };
}

function getOrCreateState(state, userId, date) {
  if (!state.has(userId)) {
    state.set(userId, new Map());
  }

  const userState = state.get(userId);

  if (!userState.has(date)) {
    userState.set(date, {
      features: createEmptyFeatures(date),
      sources: new Set(),
      logonPcs: new Set(),
      devicePcs: new Set(),
      filePcs: new Set(),
      httpPcs: new Set(),
      emailPcs: new Set(),
      files: new Set(),
      urls: new Set(),
      httpContent: new Set(),
      recipients: new Set()
    });
  }

  return userState.get(date);
}

function updateFeatureState(state, event) {
  const userId = event.userId;

  if (!userId) {
    throw new Error(
      "Telemetry event requires userId."
    );
  }

  const date = getEventDate(event);

  if (!date) {
    throw new Error(
      "Telemetry event requires a valid timestamp."
    );
  }

  const entry = getOrCreateState(
    state,
    userId,
    date
  );

  const source = getSourceType(event);
  const features = entry.features;

  entry.sources.add(source);

  features.total_activity += 1;

  const pcId =
    event.deviceId ||
    event.deviceName ||
    event.ipAddress ||
    "unknown-device";

  if (source === "logon") {
    features.logon_count += 1;
    entry.logonPcs.add(pcId);
  }

  if (source === "device") {
    features.device_event_count += 1;
    entry.devicePcs.add(pcId);
  }

  if (source === "file") {
    features.file_event_count += 1;
    entry.filePcs.add(pcId);

    const fileId =
      event.resourceId ||
      event.resourceName ||
      event.eventId;

    if (fileId) {
      entry.files.add(String(fileId));
    }

    features.file_content_events +=
      event.eventType === "FILE_ACCESS" ||
      event.eventType === "FILE_DOWNLOAD" ||
      event.eventType === "DATA_ACCESS"
        ? 1
        : 0;
  }

  if (source === "http") {
    features.http_event_count += 1;
    entry.httpPcs.add(pcId);

    const url =
      event.destinationSite ||
      event.resourceName ||
      event.resourceId;

    if (url) {
      entry.urls.add(String(url));
    }

    const httpContent =
      event.applicationShellCmd ||
      event.destinationSite ||
      event.resourceName;

    if (httpContent) {
      entry.httpContent.add(
        String(httpContent)
      );
    }
  }

  if (source === "email") {
    features.email_event_count += 1;
    entry.emailPcs.add(pcId);

    const recipient =
      event.recipient ||
      event.recipientEmail ||
      event.emailRecipient;

    if (recipient) {
      entry.recipients.add(
        String(recipient)
      );
    }

    const emailSize = Number(
      event.emailSize ||
      event.emailSizeTotal ||
      event.metadata?.emailSize ||
      0
    );

    const attachments = Number(
      event.attachments ||
      event.attachmentsTotal ||
      event.metadata?.attachments ||
      0
    );

    features.email_size_total +=
      Number.isFinite(emailSize)
        ? emailSize
        : 0;

    features.attachments_total +=
      Number.isFinite(attachments)
        ? attachments
        : 0;
  }

  features.logon_unique_pc_count =
    entry.logonPcs.size;

  features.device_unique_pc_count =
    entry.devicePcs.size;

  features.file_unique_pc_count =
    entry.filePcs.size;

  features.http_unique_pc_count =
    entry.httpPcs.size;

  features.email_unique_pc_count =
    entry.emailPcs.size;

  features.unique_files =
    entry.files.size;

  features.unique_urls =
    entry.urls.size;

  features.unique_http_content =
    entry.httpContent.size;

  features.unique_recipients =
    entry.recipients.size;

  features.cross_source_activity =
    entry.sources.size > 1
      ? features.total_activity
      : 0;

  features.is_weekend =
    features.day_of_week === 0 ||
    features.day_of_week === 6
      ? 1
      : 0;

  return {
    userId,
    date,
    features
  };
}

function getUserDayFeatures(
  state,
  userId,
  date
) {
  const userState = state.get(userId);

  if (!userState) {
    return null;
  }

  const entry = userState.get(date);

  if (!entry) {
    return null;
  }

  return {
    userId,
    date,
    features: {
      ...entry.features
    }
  };
}

function getLatestUserDayFeatures(
  state,
  userId
) {
  const userState = state.get(userId);

  if (!userState || userState.size === 0) {
    return null;
  }

  const dates = Array.from(
    userState.keys()
  ).sort();

  return getUserDayFeatures(
    state,
    userId,
    dates[dates.length - 1]
  );
}

const featureState = new Map();

export {
  updateFeatureState,
  getUserDayFeatures,
  getLatestUserDayFeatures,
  featureState
};