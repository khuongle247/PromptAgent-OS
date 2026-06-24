/**
 * Agent State Machine
 * Framework-level state machine managing agent lifecycle across all projects.
 * States: idle → active → blocked/completed/failed → review → approved/changes-requested/escalated
 */
const fs = require("fs");
const path = require("path");

const VALID_TRANSITIONS = {
  "idle": ["active"],
  "active": ["blocked", "completed", "failed"],
  "blocked": ["active", "escalated"],
  "completed": ["review"],
  "review": ["approved", "changes-requested", "failed"],
  "approved": ["idle"],
  "changes-requested": ["active"],
  "failed": ["idle", "escalated"],
  "escalated": ["idle"]
};

function getStateFilePath(projectDir) {
  return path.join(projectDir, "agent-state.json");
}

function loadState(projectDir) {
  const filePath = getStateFilePath(projectDir);
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: "1.0.0",
      projectDir,
      currentAgent: "none",
      status: "idle",
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
      history: [],
      updatedAt: new Date().toISOString()
    };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveState(projectDir, state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(getStateFilePath(projectDir), JSON.stringify(state, null, 2));
}

function transition(projectDir, agent, toStatus, reason) {
  const state = loadState(projectDir);
  const fromStatus = state.status;

  if (!VALID_TRANSITIONS[fromStatus] || !VALID_TRANSITIONS[fromStatus].includes(toStatus)) {
    throw new Error(`Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${(VALID_TRANSITIONS[fromStatus] || []).join(", ")}`);
  }

  state.currentAgent = agent;
  state.status = toStatus;
  state.lastError = toStatus === "failed" || toStatus === "escalated" ? reason : null;

  if (toStatus === "changes-requested" || toStatus === "failed") {
    state.retryCount++;
  }
  if (toStatus === "approved" || toStatus === "idle") {
    state.retryCount = 0;
  }

  state.history.push({
    fromStatus,
    toStatus,
    agent,
    timestamp: new Date().toISOString(),
    reason: reason || "No reason provided"
  });

  saveState(projectDir, state);

  if (toStatus === "escalated" || (toStatus === "failed" && state.retryCount >= state.maxRetries)) {
    console.log(`[ESCALATE] Agent ${agent} requires human intervention. Reason: ${reason}`);
  }

  return state;
}

function canTransition(projectDir) {
  const state = loadState(projectDir);
  return VALID_TRANSITIONS[state.status] || [];
}

function getStatus(projectDir) {
  return loadState(projectDir);
}

module.exports = { transition, canTransition, getStatus, loadState, VALID_TRANSITIONS };