class SseManager {
  constructor() {
    this.clients = new Set();
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('HEARTBEAT', { timestamp: new Date().toISOString() });
    }, 25000);
  }

  addClient(res) {
    if (!res) return;
    this.clients.add(res);

    // Only write headers if they haven't been sent yet
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
      });
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }
      try {
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);
      } catch (err) {
        this.clients.delete(res);
      }
    }

    // Automatically clean up when connection closes or errors
    res.on('close', () => {
      this.removeClient(res);
    });
    res.on('error', () => {
      this.removeClient(res);
    });
  }

  removeClient(res) {
    if (!res) return;
    this.clients.delete(res);
  }

  getClientCount() {
    return this.clients.size;
  }

  broadcast(type, data) {
    const message = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
    for (const client of this.clients) {
      if (!client || client.writableEnded || client.destroyed) {
        this.clients.delete(client);
        continue;
      }
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  broadcastActivity(event) {
    this.broadcast('ACTIVITY_EVENT', { event });
  }

  broadcastIncident(incident, isNew = false) {
    this.broadcast(isNew ? 'INCIDENT_CREATED' : 'INCIDENT_UPDATED', { incident });
  }

  broadcastAccessRequest(request, isNew = false) {
    this.broadcast(isNew ? 'ACCESS_REQUEST_CREATED' : 'ACCESS_REQUEST_UPDATED', { request });
  }

  broadcastRiskChange(userId, riskScore, riskLevel, user) {
    this.broadcast('RISK_SCORE_CHANGED', { userId, riskScore, riskLevel, user });
  }

  broadcastTrustChange(userId, trustScore, user) {
    this.broadcast('TRUST_SCORE_CHANGED', { userId, trustScore, user });
  }

  broadcastRiskUpdated(userId, riskScore, riskLevel, prevScore) {
    this.broadcast('RISK_SCORE_CHANGED', { userId, riskScore, riskLevel, prevScore });
  }

  broadcastUserUpdate(user, reason) {
    this.broadcast('USER_UPDATED', { user, reason });
  }

  broadcastAccountStatus(userId, status, user) {
    this.broadcast('ACCOUNT_STATUS_CHANGED', { userId, status, user });
  }

  broadcastAuditLog(log) {
    this.broadcast('AUDIT_LOG_ENTRY', { entry: log });
  }

  broadcastDevice(device) {
    this.broadcast('DEVICE_UPDATED', { device });
  }

  broadcastPolicyUpdate(config) {
    this.broadcast('POLICY_UPDATED', { config });
  }

  broadcastSimulation(scenarioName, payload) {
    this.broadcast('SIMULATION_EVENT', { scenarioName, ...payload });
  }

  broadcastPolicyDecision(data) {
    this.broadcast('POLICY_DECISION', data);
  }

  broadcastContainmentAction(data) {
    this.broadcast('CONTAINMENT_ACTION', data);
  }
}

export const sseManager = new SseManager();
