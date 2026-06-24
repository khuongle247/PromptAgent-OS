const fs = require("fs");
const path = require("path");

const STATE_FILE_NAME = "agent-state.json";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_STATE = {
  schemaVersion: "1.0.0",
  projectDir: "",
  currentAgent: "none",
  phase: 1,
  status: "idle",
  retryCount: 0,
  maxRetries: DEFAULT_MAX_RETRIES,
  lastError: null,
  history: [],
  updatedAt: new Date().toISOString()
};

function getStatePath(projectDir) {
  return path.join(projectDir, STATE_FILE_NAME);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureProjectDir(projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
}

function createInitialState(projectDir, overrides = {}) {
  return {
    ...DEFAULT_STATE,
    projectDir,
    ...overrides,
    history: Array.isArray(overrides.history) ? overrides.history.slice() : []
  };
}

function loadState(projectDir) {
  const statePath = getStatePath(projectDir);

  if (!fs.existsSync(statePath)) {
    return createInitialState(projectDir);
  }

  try {
    const state = readJson(statePath);
    return {
      ...createInitialState(projectDir),
      ...state,
      projectDir,
      phase: typeof state.phase === "number" && state.phase > 0 ? state.phase : 1,
      history: Array.isArray(state.history) ? state.history : []
    };
  } catch (error) {
    return createInitialState(projectDir, {
      status: "blocked",
      lastError: `Failed to load state: ${error.message}`
    });
  }
}

function saveState(projectDir, state) {
  ensureProjectDir(projectDir);
  const nextState = {
    ...createInitialState(projectDir),
    ...state,
    projectDir,
    phase: typeof state.phase === "number" && state.phase > 0 ? state.phase : 1,
    updatedAt: new Date().toISOString(),
    history: Array.isArray(state.history) ? state.history : []
  };

  writeJson(getStatePath(projectDir), nextState);
  return nextState;
}

function appendHistory(projectDir, state, transition) {
  const nextState = {
    ...state,
    history: [
      ...(Array.isArray(state.history) ? state.history : []),
      {
        fromAgent: transition.fromAgent || state.currentAgent || "none",
        toAgent: transition.toAgent || state.currentAgent || "none",
        fromStatus: transition.fromStatus || state.status || "idle",
        toStatus: transition.toStatus || state.status || "idle",
        phase: transition.phase ?? state.phase ?? 0,
        timestamp: new Date().toISOString(),
        reason: transition.reason || "No reason provided"
      }
    ]
  };

  return saveState(projectDir, nextState);
}

const eventBus = require("./event-bus"); // New import

async function updateState(projectDir, patch = {}, transition) {
  const current = loadState(projectDir);
  const oldState = { ...current }; // Capture old state before merging
  
  const merged = {
    ...current,
    ...patch,
    projectDir,
    updatedAt: new Date().toISOString()
  };

  if (typeof merged.retryCount !== "number" || Number.isNaN(merged.retryCount)) {
    merged.retryCount = 0;
  }

  if (typeof merged.maxRetries !== "number" || Number.isNaN(merged.maxRetries)) {
    merged.maxRetries = DEFAULT_MAX_RETRIES;
  }

  if (transition) {
    appendHistory(projectDir, merged, transition);
  }

  const newState = saveState(projectDir, merged);
  
  // Emit AgentStateUpdated event
  await eventBus.publish("state-updated", {
    agent: newState.currentAgent, // Agent whose state was updated
    oldState: oldState, 
    newState: newState,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    reason: transition?.reason || "State updated" 
  });

  return newState;
}

function resetState(projectDir, overrides = {}) {
  return saveState(projectDir, createInitialState(projectDir, overrides));
}

function incrementRetry(projectDir, reason, patch = {}) {
  const state = loadState(projectDir);
  return updateState(projectDir, {
    ...patch,
    retryCount: (state.retryCount || 0) + 1,
    lastError: reason || state.lastError,
    status: "failed"
  }, {
    fromAgent: state.currentAgent,
    toAgent: state.currentAgent,
    fromStatus: state.status,
    toStatus: "failed",
    phase: state.phase,
    reason: reason || "Retry incremented"
  });
}

function setCurrentAgent(projectDir, currentAgent, patch = {}, transition) {
  return updateState(projectDir, {
    ...patch,
    currentAgent
  }, transition ? { ...transition, toAgent: currentAgent } : null);
}

function setAgentStatus(projectDir, currentAgent, status, reason, patch = {}) {
  const state = loadState(projectDir);
  const nextPatch = {
    ...patch,
    currentAgent,
    status,
    lastError: status === "failed" || status === "blocked" || status === "escalated" ? (reason || state.lastError) : null
  };

  if (status === "approved" || status === "idle") {
    nextPatch.retryCount = 0;
  }

  return updateState(projectDir, nextPatch, {
    fromAgent: state.currentAgent,
    toAgent: currentAgent,
    fromStatus: state.status,
    toStatus: status,
    phase: patch.phase ?? state.phase,
    reason: reason || "State updated"
  });
}

function bumpPhase(projectDir, phase, patch = {}) {
  return updateState(projectDir, {
    ...patch,
    phase
  });
}

function getStatus(projectDir) {
  return loadState(projectDir);
}

module.exports = {
  STATE_FILE_NAME,
  DEFAULT_MAX_RETRIES,
  DEFAULT_STATE,
  getStatePath,
  loadState,
  saveState,
  updateState,
  resetState,
  incrementRetry,
  setCurrentAgent,
  setAgentStatus,
  bumpPhase,
  getStatus
};