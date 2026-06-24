const fs = require("fs");
const path = require("path");

const { loadState, saveState, getStatus } = require("./state-manager");
const { listArtifacts, readArtifact } = require("./artifact-store");
const { getNextAgent } = require("./transition-engine");
const { orchestrate } = require("./agent-orchestrator");

const RECOVERY_FILE_NAME = "execution-state.json";

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function getRecoveryPath(projectDir) {
  return path.join(projectDir, RECOVERY_FILE_NAME);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function inferStepStatus(record) {
  if (!record || !record.output) {
    return "blocked";
  }

  if (record.role === "reviewer") {
    return String(record.output.decision || "").toLowerCase() || "approved";
  }

  return "completed";
}

function inferResumeAgentFromArtifact(record) {
  if (!record || !record.output) {
    return null;
  }

  const status = inferStepStatus(record);
  return getNextAgent(record.role, status);
}

function getLatestArtifactRecord(projectDir) {
  const artifacts = listArtifacts(projectDir);
  return artifacts.length ? artifacts[0] : null;
}

function hydrateArtifact(projectDir, record) {
  if (!record) {
    return null;
  }

  const artifact = readArtifact(projectDir, {
    role: record.role,
    taskId: record.taskId
  });

  return artifact || record;
}

function captureExecutionState(rootDir, projectName) {
  const projectDir = getProjectDir(rootDir, projectName);
  const state = loadState(projectDir);
  const artifacts = listArtifacts(projectDir);
  const latestArtifactRecord = getLatestArtifactRecord(projectDir);
  const latestArtifact = hydrateArtifact(projectDir, latestArtifactRecord);
  const derivedResumeAgent = latestArtifactRecord ? inferResumeAgentFromArtifact(latestArtifactRecord) : null;
  const currentResumeAgent = state.currentAgent && state.currentAgent !== "none" ? state.currentAgent : derivedResumeAgent;

  return {
    schemaVersion: "1.0.0",
    projectName,
    projectDir,
    state,
    artifacts,
    lastValidStep: latestArtifact,
    resumeAgent: currentResumeAgent,
    canResume: Boolean(currentResumeAgent),
    updatedAt: new Date().toISOString()
  };
}

function persistExecutionState(rootDir, projectName, snapshot) {
  const projectDir = getProjectDir(rootDir, projectName);
  const state = snapshot || captureExecutionState(rootDir, projectName);
  const recoveryPath = getRecoveryPath(projectDir);

  writeJson(recoveryPath, state);
  return {
    ...state,
    recoveryPath
  };
}

function loadExecutionState(rootDir, projectName) {
  const projectDir = getProjectDir(rootDir, projectName);
  const recoveryPath = getRecoveryPath(projectDir);

  if (!fs.existsSync(recoveryPath)) {
    return null;
  }

  try {
    return readJson(recoveryPath);
  } catch (error) {
    return null;
  }
}

function recoverExecution(rootDir, projectName) {
  const projectDir = getProjectDir(rootDir, projectName);
  const snapshot = captureExecutionState(rootDir, projectName);
  const persisted = persistExecutionState(rootDir, projectName, snapshot);
  const state = persisted.state || loadState(projectDir);

  if (!snapshot.resumeAgent) {
    return {
      recovered: false,
      resumeAgent: null,
      projectName,
      projectDir,
      snapshot: persisted,
      state
    };
  }

  const nextState = saveState(projectDir, {
    ...state,
    currentAgent: snapshot.resumeAgent,
    status: "active",
    lastError: null,
    retryCount: state.retryCount || 0,
    phase: typeof state.phase === "number" && state.phase > 0 ? state.phase : 1
  });

  return {
    recovered: true,
    resumeAgent: snapshot.resumeAgent,
    projectName,
    projectDir,
    snapshot: persisted,
    state: nextState
  };
}

async function resumeExecution(rootDir, projectName, options = {}) {
  const recovery = recoverExecution(rootDir, projectName);

  if (!recovery.recovered) {
    return {
      ...recovery,
      resumed: false,
      result: null
    };
  }

  const result = await orchestrate(rootDir, projectName, options);

  return {
    ...recovery,
    resumed: true,
    result
  };
}

module.exports = {
  RECOVERY_FILE_NAME,
  getProjectDir,
  getRecoveryPath,
  inferStepStatus,
  inferResumeAgentFromArtifact,
  getLatestArtifactRecord,
  hydrateArtifact,
  captureExecutionState,
  persistExecutionState,
  loadExecutionState,
  recoverExecution,
  resumeExecution
};

if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.log("Usage: node workflow/state-recovery-engine.js ProjectName");
    process.exit(1);
  }

  resumeExecution(process.cwd(), projectName)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.resumed ? 0 : 1);
    })
    .catch(error => {
      console.error(error.stack || error.message);
      process.exit(1);
    });
}