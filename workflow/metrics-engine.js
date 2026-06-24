const fs = require("fs");
const path = require("path");

const METRICS_DIR = path.join(process.cwd(), "metrics");

let initialized = false;

// In-memory metric accumulators
const agentMetrics = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  retryCount: 0,
  avgDuration: 0,
  _durationSum: 0,
  _durationCount: 0
};

const taskMetrics = {
  totalTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  avgCycleTime: 0,
  _cycleTimeSum: 0,
  _cycleTimeCount: 0
};

const learningMetrics = {
  lessonsLearned: 0,
  reusablePatterns: 0,
  memoryUpdates: 0
};

function ensureMetricsDir() {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }
}

function persistAgentMetrics() {
  ensureMetricsDir();
  const filePath = path.join(METRICS_DIR, "agent-performance.json");
  const data = {
    totalExecutions: agentMetrics.totalExecutions,
    successfulExecutions: agentMetrics.successfulExecutions,
    failedExecutions: agentMetrics.failedExecutions,
    retryCount: agentMetrics.retryCount,
    avgDuration: agentMetrics._durationCount > 0
      ? Math.round(agentMetrics._durationSum / agentMetrics._durationCount)
      : 0,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function persistTaskMetrics() {
  ensureMetricsDir();
  const filePath = path.join(METRICS_DIR, "task-metrics.json");
  const data = {
    totalTasks: taskMetrics.totalTasks,
    completedTasks: taskMetrics.completedTasks,
    failedTasks: taskMetrics.failedTasks,
    avgCycleTime: taskMetrics._cycleTimeCount > 0
      ? Math.round(taskMetrics._cycleTimeSum / taskMetrics._cycleTimeCount)
      : 0,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function persistLearningMetrics() {
  ensureMetricsDir();
  const filePath = path.join(METRICS_DIR, "learning-metrics.json");
  const data = {
    lessonsLearned: learningMetrics.lessonsLearned,
    reusablePatterns: learningMetrics.reusablePatterns,
    memoryUpdates: learningMetrics.memoryUpdates,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function handleAgentExecuted(payload) {
  agentMetrics.totalExecutions += 1;

  if (payload.ok === true) {
    agentMetrics.successfulExecutions += 1;
  } else {
    agentMetrics.failedExecutions += 1;
  }

  if (typeof payload.duration === "number") {
    agentMetrics._durationSum += payload.duration;
    agentMetrics._durationCount += 1;
  }

  persistAgentMetrics();
}

function handleAgentTransitioned(payload) {
  // Track retries: if transitioning to a retry state
  if (payload.action === "retry") {
    agentMetrics.retryCount += 1;
    persistAgentMetrics();
  }

  // Track task lifecycle
  if (payload.toStatus === "approved" || payload.toStatus === "completed") {
    taskMetrics.completedTasks += 1;
    persistTaskMetrics();
  }

  if (payload.toStatus === "failed" || payload.toStatus === "escalated") {
    taskMetrics.failedTasks += 1;
    persistTaskMetrics();
  }
}

function handleHealingCycleCompleted(payload) {
  // A healing cycle completion implies a task lifecycle event
  taskMetrics.totalTasks += 1;

  if (payload.passed === true) {
    taskMetrics.completedTasks += 1;
  } else {
    taskMetrics.failedTasks += 1;
  }

  persistTaskMetrics();
}

function handleLessonLearned(payload) {
  learningMetrics.lessonsLearned += 1;
  persistLearningMetrics();
}

function handleMemoryImportanceUpdated(payload) {
  learningMetrics.memoryUpdates += 1;
  persistLearningMetrics();
}

function handleReusablePatternIdentified(payload) {
  learningMetrics.reusablePatterns += 1;
  persistLearningMetrics();
}

function initialize(eventBus) {
  if (initialized) {
    return;
  }

  ensureMetricsDir();

  // Subscribe to AgentExecuted
  eventBus.subscribe("agent-executed", (payload) => {
    handleAgentExecuted(payload);
  });

  // Subscribe to AgentTransitioned
  eventBus.subscribe("agent-transitioned", (payload) => {
    handleAgentTransitioned(payload);
  });

  // Subscribe to HealingCycleCompleted
  eventBus.subscribe("healing-cycle-completed", (payload) => {
    handleHealingCycleCompleted(payload);
  });

  // Subscribe to LessonLearned
  eventBus.subscribe("lesson-learned", (payload) => {
    handleLessonLearned(payload);
  });

  // Subscribe to MemoryImportanceUpdated
  eventBus.subscribe("memory-importance-updated", (payload) => {
    handleMemoryImportanceUpdated(payload);
  });

  // Subscribe to ReusablePatternIdentified
  eventBus.subscribe("reusable-pattern-identified", (payload) => {
    handleReusablePatternIdentified(payload);
  });

  initialized = true;
  console.log("[MetricsEngine] Initialized. Tracking agent, task, and learning metrics.");
}

function getAgentMetrics() {
  return {
    totalExecutions: agentMetrics.totalExecutions,
    successfulExecutions: agentMetrics.successfulExecutions,
    failedExecutions: agentMetrics.failedExecutions,
    retryCount: agentMetrics.retryCount,
    avgDuration: agentMetrics._durationCount > 0
      ? Math.round(agentMetrics._durationSum / agentMetrics._durationCount)
      : 0
  };
}

function getTaskMetrics() {
  return {
    totalTasks: taskMetrics.totalTasks,
    completedTasks: taskMetrics.completedTasks,
    failedTasks: taskMetrics.failedTasks,
    avgCycleTime: taskMetrics._cycleTimeCount > 0
      ? Math.round(taskMetrics._cycleTimeSum / taskMetrics._cycleTimeCount)
      : 0
  };
}

function getLearningMetrics() {
  return {
    lessonsLearned: learningMetrics.lessonsLearned,
    reusablePatterns: learningMetrics.reusablePatterns,
    memoryUpdates: learningMetrics.memoryUpdates
  };
}

function getAllMetrics() {
  return {
    agent: getAgentMetrics(),
    task: getTaskMetrics(),
    learning: getLearningMetrics(),
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  initialize,
  getAgentMetrics,
  getTaskMetrics,
  getLearningMetrics,
  getAllMetrics
};