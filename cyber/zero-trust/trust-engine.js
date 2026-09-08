import { db } from '../../server/models/db.js';
import { sseManager } from '../../server/services/sse.js';

class TrustEngine {
  updateTrustScore(user, evaluation, eventSummary = 'Access Evaluation') {
    if (!user) return 85;

    let currentTrust = typeof user.currentTrustScore === 'number' ? user.currentTrustScore : 90;
    const riskScore = evaluation.riskScore || 0;

    let trustDelta = 0;
    if (riskScore >= 90) {
      trustDelta = -35;
    } else if (riskScore >= 75) {
      trustDelta = -20;
    } else if (riskScore >= 50) {
      trustDelta = -10;
    } else if (riskScore <= 20) {
      trustDelta = 2; // Incremental trust recovery
    }

    const newTrust = Math.min(100, Math.max(5, currentTrust + trustDelta));
    user.currentTrustScore = newTrust;

    // Persist to in-memory db trust history
    if (db.trustHistories) {
      if (!db.trustHistories[user.id]) {
        db.trustHistories[user.id] = [];
      }
      db.trustHistories[user.id].push({
        timestamp: new Date().toISOString(),
        score: newTrust,
        riskScore,
        reason: eventSummary
      });
      // Keep last 50
      if (db.trustHistories[user.id].length > 50) {
        db.trustHistories[user.id].shift();
      }
    }

    // Broadcast trust change
    sseManager.broadcastTrustChange(user.id, newTrust, user);

    return newTrust;
  }
}

export const trustEngine = new TrustEngine();
