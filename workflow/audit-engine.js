const fs = require("fs");
const path = require("path");

const AUDIT_LOG_PATH = path.join(process.cwd(), "logs", "audit.jsonl");

let initialized = false;

function ensureLogDir() {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateId() {
  return `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function extractActor(payload, eventType) {
  // Attempt to extract an actor identifier from common event payload patterns
  if (payload.agent) return payload.agent;
  if (payload.toAgent) return payload.toAgent;
  if (payload.actor) return payload.actor;
  if (eventType.startsWith("healing")) return "self-healing-engine";
  if (
    eventType.startsWith("lesson") ||
    eventType.startsWith("memory") ||
    eventType.startsWith("reusable")
  )
    return "learning-loop-engine";
  if (eventType === "state-updated") return "state-manager";
  if (eventType === "task-status-updated") return "agent-orchestrator";
  if (eventType === "project-phase-bumped") return "agent-orchestrator";
  return "system";
}

function extractCorrelationId(payload) {
  // Attempt to extract a correlation ID from common payload fields
  if (payload.taskId) return `task-${payload.taskId}`;
  if (payload.lessonId) return payload.lessonId;
  if (payload.bugId) return payload.bugId;
  if (payload.memoryId) return payload.memoryId;
  if (payload.patternId) return payload.patternId;
  if (payload.eventId) return payload.eventId;
  if (payload.artifactPath) return `artifact-${payload.artifactPath}`;
  return null;
}

function initialize(eventBus) {
  if (initialized) {
    return;
  }

  ensureLogDir();

  // Subscribe to all events via wildcard
  eventBus.subscribe("*", (eventType, payload) => {
    const record = {
      id: generateId(),
      eventType,
      timestamp: new Date().toISOString(),
      actor: extractActor(payload, eventType),
      payload,
      correlationId: extractCorrelationId(payload)
    };

    try {
      fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(record) + "\n");
    } catch (err) {
      console.error(`[AuditEngine] Failed to write audit record: ${err.message}`);
    }
  });

  initialized = true;
  console.log(`[AuditEngine] Initialized. Logging to ${AUDIT_LOG_PATH}`);
}

function logEvent(event) {
  // Manual log entry for programmatic use
  ensureLogDir();

  const record = {
    id: event.id || generateId(),
    eventType: event.eventType || "manual",
    timestamp: event.timestamp || new Date().toISOString(),
    actor: event.actor || "system",
    payload: event.payload || {},
    correlationId: event.correlationId || null
  };

  try {
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(record) + "\n");
    return record.id;
  } catch (err) {
    console.error(`[AuditEngine] Failed to write manual audit record: ${err.message}`);
    return null;
  }
}

function getAuditLog(filter = {}, limit = 100) {
  ensureLogDir();

  if (!fs.existsSync(AUDIT_LOG_PATH)) {
    return [];
  }

  try {
    const content = fs.readFileSync(AUDIT_LOG_PATH, "utf8");
    const lines = content.trim().split("\n").filter(Boolean).reverse(); // Most recent first

    const results = [];

    for (const line of lines) {
      if (results.length >= limit) break;

      try {
        const record = JSON.parse(line);

        // Apply filters
        let matches = true;

        if (filter.eventType && record.eventType !== filter.eventType) {
          matches = false;
        }
        if (filter.actor && record.actor !== filter.actor) {
          matches = false;
        }
        if (filter.correlationId && record.correlationId !== filter.correlationId) {
          matches = false;
        }
        if (filter.since && new Date(record.timestamp) < new Date(filter.since)) {
          matches = false;
        }
        if (filter.until && new Date(record.timestamp) > new Date(filter.until)) {
          matches = false;
        }

        if (matches) {
          results.push(record);
        }
      } catch (parseErr) {
        // Skip malformed lines
        continue;
      }
    }

    return results;
  } catch (err) {
    console.error(`[AuditEngine] Failed to read audit log: ${err.message}`);
    return [];
  }
}

function getAuditLogPath() {
  return AUDIT_LOG_PATH;
}

module.exports = {
  initialize,
  logEvent,
  getAuditLog,
  getAuditLogPath
};
