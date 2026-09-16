import {
  updateFeatureState,
  getUserDayFeatures,
  featureState
} from "./ml-feature-aggregator.js";

const events = [
  {
    eventId: "test-1",
    userId: "user-001",
    timestamp: "2026-09-15T10:00:00.000Z",
    eventType: "LOGIN",
    deviceId: "dev-001"
  },
  {
    eventId: "test-2",
    userId: "user-001",
    timestamp: "2026-09-15T10:10:00.000Z",
    eventType: "FILE_ACCESS",
    deviceId: "dev-001",
    resourceId: "file-001"
  },
  {
    eventId: "test-3",
    userId: "user-001",
    timestamp: "2026-09-15T10:20:00.000Z",
    eventType: "SHELL_EXECUTION",
    deviceId: "dev-001",
    destinationSite: "github.com",
    applicationShellCmd: "git pull"
  },
  {
    eventId: "test-4",
    userId: "user-001",
    timestamp: "2026-09-15T10:30:00.000Z",
    eventType: "FILE_DOWNLOAD",
    deviceId: "dev-001",
    resourceId: "file-002"
  }
];

for (const event of events) {
  updateFeatureState(featureState, event);
}

const result = getUserDayFeatures(
  featureState,
  "user-001",
  "2026-09-15"
);

console.log(
  JSON.stringify(result, null, 2)
);

const expectedFeatures = [
  "logon_count",
  "device_event_count",
  "file_event_count",
  "http_event_count",
  "email_event_count",
  "day_of_week",
  "is_weekend",
  "logon_unique_pc_count",
  "device_unique_pc_count",
  "file_unique_pc_count",
  "http_unique_pc_count",
  "email_unique_pc_count",
  "unique_files",
  "file_content_events",
  "unique_urls",
  "unique_http_content",
  "unique_recipients",
  "email_size_total",
  "attachments_total",
  "total_activity",
  "cross_source_activity"
];

const actualFeatures = Object.keys(
  result.features
);

const missing = expectedFeatures.filter(
  feature => !actualFeatures.includes(feature)
);

if (missing.length > 0) {
  throw new Error(
    `Missing features: ${missing.join(", ")}`
  );
}

if (actualFeatures.length !== 21) {
  throw new Error(
    `Expected 21 features, got ${actualFeatures.length}`
  );
}

console.log("21-feature schema test: PASSED");