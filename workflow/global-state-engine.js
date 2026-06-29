const fs = require("fs");
const path = require("path");

const { loadState, saveState, getStatus } = require("./state-manager");
const { listArtifacts, readArtifact } = require("./artifact-store");
const { readJsonSafe, readTextSafe } = require("../scripts/validation/validation-utils");

const SNAPSHOT_DIR_NAME = path.join("workflow", "snapshots");
const DEFAULT_DRIFT_THRESHOLD = 0.25;

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function getSnapshotDir(rootDir) {
  return path.join(rootDir, SNAPSHOT_DIR_NAME);
}

function getSnapshotPath(rootDir, timestamp) {
  const safeTimestamp = String(timestamp).replace(/[:.]/g, "-");
  return path.join(getSnapshotDir(rootDir), `state-${safeTimestamp}.json`);
}

function getLatestSnapshotPath(rootDir, projectName) {
  const snapshotDir = getSnapshotDir(rootDir);
  if (!fs.existsSync(snapshotDir)) {
    return null;
  }

  const prefix = `state-`;
  const files = fs.readdirSync(snapshotDir)
    .filter(fileName => fileName.startsWith(prefix) && fileName.endsWith(".json"))
    .map(fileName => ({
      fileName,
      fullPath: path.join(snapshotDir, fileName)
    }))
    .filter(entry => {
      if (!projectName) {
        return true;
      }

      const snapshot = readJsonSafe(entry.fullPath);
      return snapshot && snapshot.projectName === projectName;
    });

  if (!files.length) {
    return null;
  }

  files.sort((left, right) => {
    const leftTime = fs.statSync(left.fullPath).mtimeMs;
    const rightTime = fs.statSync(right.fullPath).mtimeMs;
    return rightTime - leftTime;
  });

  return files[0].fullPath;
}

function safeLoadTaskData(projectDir) {
  const tasksPath = path.join(projectDir, "tasks", "tasks.json");
  const tasksFile = readJsonSafe(tasksPath);
  return Array.isArray(tasksFile?.tasks) ? tasksFile.tasks : [];
}

function safeLoadMemoryData(projectDir) {
  const memoryPath = path.join(projectDir, "memory", "memory.json");
  const summaryPath = path.join(projectDir, "memory", "memory-summary.json");

  return {
    raw: readJsonSafe(memoryPath),
    summary: readJsonSafe(summaryPath)
  };
}

function loadArtifactDetails(projectDir) {
  const artifacts = listArtifacts(projectDir);

  return artifacts.map(record => ({
    ...record,
    output: readArtifact(projectDir, {
      role: record.role,
      taskId: record.taskId
    })?.output || null
  }));
}

function deriveArtifactStatus(artifact) {
  if (!artifact || !artifact.output) {
    return "unknown";
  }

  if (artifact.role === "planner") {
    return "todo";
  }

  if (artifact.role === "architect") {
    return "review";
  }

  if (artifact.role === "coder") {
    const failed = Number(artifact.output?.testResults?.failed || 0);
    return failed > 0 ? "blocked" : "done";
  }

  if (artifact.role === "reviewer") {
    const decision = String(artifact.output?.decision || "").toLowerCase();
    if (decision === "approved") {
      return "done";
    }
    if (decision === "rejected") {
      return "blocked";
    }
    return "review";
  }

  if (artifact.role === "debugger") {
    return "blocked";
  }

  return "unknown";
}

function deriveExecutionState(artifact) {
  return {
    role: artifact.role,
    taskId: artifact.taskId,
    artifactStatus: deriveArtifactStatus(artifact),
    source: artifact.source || "system",
    schemaPath: artifact.schemaPath || null,
    updatedAt: artifact.updatedAt || artifact.createdAt || new Date().toISOString()
  };
}

function buildAgentsState(projectDir) {
  const state = loadState(projectDir);
  const artifacts = loadArtifactDetails(projectDir);

  return {
    current: {
      currentAgent: state.currentAgent,
      status: state.status,
      phase: state.phase,
      retryCount: state.retryCount,
      maxRetries: state.maxRetries,
      lastError: state.lastError,
      history: Array.isArray(state.history) ? state.history.slice() : [],
      updatedAt: state.updatedAt
    },
    execution: artifacts.map(deriveExecutionState),
    latestArtifact: artifacts[0] || null,
    stateFile: state
  };
}

function buildTaskView(tasks, artifacts) {
  return tasks.map(task => {
    const relatedArtifacts = artifacts.filter(artifact => artifact.taskId === task.id);
    const latestArtifact = relatedArtifacts[0] || null;

    return {
      ...task,
      artifactStatus: latestArtifact ? deriveArtifactStatus(latestArtifact) : null,
      latestArtifactRole: latestArtifact ? latestArtifact.role : null,
      latestArtifactUpdatedAt: latestArtifact ? latestArtifact.updatedAt : null
    };
  });
}

function buildGlobalState(rootDir, projectName, options = {}) {
  const projectDir = getProjectDir(rootDir, projectName);
  const tasks = safeLoadTaskData(projectDir);
  const memory = safeLoadMemoryData(projectDir);
  const artifacts = loadArtifactDetails(projectDir);
  const agents = buildAgentsState(projectDir);
  const timestamp = new Date().toISOString();

  const unifiedState = {
    tasks: buildTaskView(tasks, artifacts),
    memory: {
      raw: memory.raw,
      summary: memory.summary,
      appendOnly: true
    },
    artifacts,
    agents,
    timestamp,
    projectName,
    projectDir
  };

  const reconciled = reconcileState(unifiedState, {
    rootDir,
    projectName,
    threshold: options.threshold,
    saveSnapshot: options.saveSnapshot !== false,
    triggerHealing: options.triggerHealing !== false
  });

  return reconciled.state;
}

function detectConflicts(state) {
  const conflicts = [];
  const taskMap = new Map((state.tasks || []).map(task => [task.id, task]));
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  const agents = state.agents || {};
  const agentState = agents.current || {};
  const executionStates = Array.isArray(agents.execution) ? agents.execution : [];

  for (const artifact of artifacts) {
    const task = taskMap.get(artifact.taskId);
    if (!task) {
      continue;
    }

    const artifactStatus = deriveArtifactStatus(artifact);
    if (!artifactStatus || artifactStatus === "unknown") {
      continue;
    }

    if (task.status !== artifactStatus) {
      const safe = artifactStatus === "done" || artifactStatus === "review" || artifactStatus === "blocked";
      conflicts.push({
        type: "task-artifact-status",
        entityId: task.id,
        severity: safe ? "low" : "high",
        description: `Task status ${task.status} does not match artifact status ${artifactStatus} for role ${artifact.role}.`,
        safe,
        sourceRole: artifact.role,
        artifactStatus,
        taskStatus: task.status
      });
    }
  }

  const latestExecution = executionStates[0] || null;
  if (latestExecution && agentState.currentAgent && agentState.currentAgent !== "none") {
    if (agentState.currentAgent !== latestExecution.role) {
      conflicts.push({
        type: "agent-execution-state",
        entityId: agentState.currentAgent,
        severity: "medium",
        description: `Current agent ${agentState.currentAgent} differs from latest execution role ${latestExecution.role}.`,
        safe: true,
        agentState: agentState.currentAgent,
        executionState: latestExecution.role
      });
    }

    const executionStatus = latestExecution.artifactStatus;
    if (executionStatus && agentState.status && agentState.status !== executionStatus) {
      conflicts.push({
        type: "agent-execution-status",
        entityId: latestExecution.role,
        severity: executionStatus === "done" ? "low" : "medium",
        description: `Agent status ${agentState.status} does not match latest execution status ${executionStatus}.`,
        safe: executionStatus === "done" || executionStatus === "review",
        agentStatus: agentState.status,
        executionStatus
      });
    }
  }

  return conflicts;
}

function reconcileTaskStatus(task, artifactStatus) {
  if (!artifactStatus || artifactStatus === "unknown") {
    return task;
  }

  if (artifactStatus === "done") {
    return {
      ...task,
      status: "done"
    };
  }

  if (artifactStatus === "review" && ["todo", "in_progress"].includes(task.status)) {
    return {
      ...task,
      status: "review"
    };
  }

  if (artifactStatus === "blocked" && ["todo", "in_progress", "review"].includes(task.status)) {
    return {
      ...task,
      status: "blocked"
    };
  }

  return task;
}

function reconcileState(state, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const projectName = options.projectName || state.projectName || path.basename(state.projectDir || "");
  const projectDir = state.projectDir || getProjectDir(rootDir, projectName);
  const conflicts = detectConflicts(state);
  const safeConflicts = conflicts.filter(conflict => conflict.safe);
  const unsafeConflicts = conflicts.filter(conflict => !conflict.safe);
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  const artifactByTask = new Map();

  for (const artifact of artifacts) {
    if (!artifactByTask.has(artifact.taskId)) {
      artifactByTask.set(artifact.taskId, artifact);
    }
  }

  const reconciledTasks = (state.tasks || []).map(task => {
    const artifact = artifactByTask.get(task.id);
    const artifactStatus = artifact ? deriveArtifactStatus(artifact) : null;
    return reconcileTaskStatus(task, artifactStatus);
  });

  const agentState = state.agents?.current || {};
  const latestArtifact = state.agents?.latestArtifact || null;
  const latestExecutionStatus = latestArtifact ? deriveArtifactStatus(latestArtifact) : null;
  const reconciledAgentState = {
    ...agentState,
    currentAgent: latestArtifact && latestExecutionStatus === "done" ? getNextAgentRole(latestArtifact.role) : agentState.currentAgent,
    status: latestExecutionStatus === "done" ? "approved" : agentState.status,
    lastError: unsafeConflicts.length ? (agentState.lastError || "Global state reconciliation detected unsafe conflicts.") : null
  };

  const reconciled = {
    tasks: reconciledTasks,
    memory: {
      raw: state.memory?.raw || null,
      summary: state.memory?.summary || null,
      appendOnly: true
    },
    artifacts,
    agents: {
      ...state.agents,
      current: reconciledAgentState,
      execution: Array.isArray(state.agents?.execution) ? state.agents.execution : [],
      latestArtifact
    },
    timestamp: new Date().toISOString(),
    projectName,
    projectDir
  };

  const drift = detectDrift(state, reconciled, {
    threshold: typeof options.threshold === "number" ? options.threshold : DEFAULT_DRIFT_THRESHOLD,
    snapshotRoot: rootDir,
    projectName
  });

  const snapshotPath = options.saveSnapshot === false ? null : persistSnapshot(rootDir, projectName, {
    ...reconciled,
    conflicts,
    drift
  });

  let selfHealingTriggered = false;
  if (options.triggerHealing !== false && (drift.triggered || unsafeConflicts.length > 0)) {
    selfHealingTriggered = triggerSelfHealing(rootDir, projectName, {
      state: reconciled,
      conflicts,
      drift,
      latestArtifact,
      maxRetries: options.maxRetries
    });
  }

  return {
    state: reconciled,
    conflicts,
    safeConflicts,
    unsafeConflicts,
    drift,
    snapshotPath,
    selfHealingTriggered
  };
}

function getNextAgentRole(artifact) {
  if (!artifact) {
    return null;
  }

  if (artifact.role === "planner") return "architect";
  if (artifact.role === "architect") return "coder";
  if (artifact.role === "coder") return "reviewer";
  if (artifact.role === "reviewer") return null;
  if (artifact.role === "debugger") return "coder";

  return null;
}

function summarizeState(state) {
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  const agents = state.agents || {};

  return {
    tasks: tasks.map(task => ({ id: task.id, status: task.status, artifactStatus: task.artifactStatus || null })),
    artifacts: artifacts.map(artifact => ({ role: artifact.role, taskId: artifact.taskId, status: deriveArtifactStatus(artifact) })),
    agent: agents.current || null,
    timestamp: state.timestamp
  };
}

function detectDrift(currentState, reconciledState, options = {}) {
  const threshold = typeof options.threshold === "number" ? options.threshold : DEFAULT_DRIFT_THRESHOLD;
  const lastSnapshotPath = getLatestSnapshotPath(options.snapshotRoot || process.cwd(), options.projectName);
  const lastSnapshot = lastSnapshotPath ? readJsonSafe(lastSnapshotPath) : null;

  if (!lastSnapshot) {
    return {
      score: 0,
      threshold,
      triggered: false,
      reason: "No baseline snapshot available",
      lastSnapshotPath
    };
  }

  const currentSummary = summarizeState(currentState);
  const baselineSummary = summarizeState(lastSnapshot);
  const compared = [];

  compared.push([JSON.stringify(currentSummary.tasks), JSON.stringify(baselineSummary.tasks)]);
  compared.push([JSON.stringify(currentSummary.artifacts), JSON.stringify(baselineSummary.artifacts)]);
  compared.push([JSON.stringify(currentSummary.agent), JSON.stringify(baselineSummary.agent)]);

  const differences = compared.filter(([left, right]) => left !== right).length;
  const score = differences / Math.max(1, compared.length);

  return {
    score,
    threshold,
    triggered: score > threshold,
    reason: score > threshold ? `Drift score ${score.toFixed(2)} exceeded threshold ${threshold.toFixed(2)}` : "Drift within acceptable range",
    lastSnapshotPath,
    currentSummary,
    baselineSummary
  };
}

function persistSnapshot(rootDir, projectName, state) {
  const timestamp = new Date().toISOString();
  const snapshotPath = getSnapshotPath(rootDir, timestamp);
  ensureDirectory(getSnapshotDir(rootDir));

  writeJson(snapshotPath, {
    ...state,
    projectName,
    timestamp
  });

  return snapshotPath;
}

function triggerSelfHealing(rootDir, projectName, options = {}) {
  try {
    const healing = require("./self-healing-engine");
    if (typeof healing.runSelfHealing !== "function") {
      return false;
    }

    healing.runSelfHealing(rootDir, projectName, {
      maxRetries: options.maxRetries || 3,
      debuggerArtifact: options.latestArtifact && options.latestArtifact.role === "debugger" ? options.latestArtifact : null
    });

    return true;
  } catch (error) {
    return false;
  }
}

function hasUnsafeConflicts(conflicts) {
  return (conflicts || []).some(conflict => !conflict.safe);
}

module.exports = {
  buildGlobalState,
  detectConflicts,
  reconcileState
};