const path = require("path");
const { readJsonSafe, readTextSafe } = require("../scripts/validation/validation-utils");
const { listArtifacts } = require("./artifact-store");

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function loadMemory(projectDir) {
  const memoryPath = path.join(projectDir, "memory", "memory.json");
  return (
    readJsonSafe(memoryPath) || {
      decisions: [],
      architecture: [],
      completedTasks: [],
      bugs: [],
      conventions: [],
      risks: []
    }
  );
}

function loadTasks(projectDir) {
  const tasksPath = path.join(projectDir, "tasks", "tasks.json");
  const tasksFile = readJsonSafe(tasksPath);
  return tasksFile?.tasks || [];
}

function extractADRs(memory) {
  return memory.architecture.map(adr => ({
    id: adr.id,
    title: adr.title,
    context: adr.context,
    decision: adr.decision,
    consequences: adr.consequences,
    type: "ADR"
  }));
}

function extractCompletedTasks(tasks) {
  return tasks
    .filter(t => t.status === "done")
    .map(t => ({
      id: t.id,
      title: t.title,
      module: t.module,
      description: t.definitionOfDone.join(" "),
      type: "CompletedTask"
    }));
}

function extractArtifactSummaries(projectDir) {
  const artifacts = listArtifacts(projectDir);
  return artifacts.map(artifact => ({
    id: `${artifact.role}-${artifact.taskId}`,
    role: artifact.role,
    taskId: artifact.taskId,
    summary:
      artifact.output?.summary ||
      artifact.output?.metadata?.assumptions?.join(" ") ||
      JSON.stringify(artifact.output).slice(0, 100),
    type: "Artifact"
  }));
}

function buildKnowledgeGraph(projectDir) {
  const memory = loadMemory(projectDir);
  const tasks = loadTasks(projectDir);
  const artifacts = extractArtifactSummaries(projectDir);

  const nodes = [];
  const edges = [];

  // Add memory records as nodes
  Object.values(memory).forEach(category => {
    if (Array.isArray(category)) {
      category.forEach(record => {
        nodes.push({
          id: record.id || `mem-${nodes.length}`,
          label: record.title || record.description || record.id || "Memory Record",
          type: record.type || "memory",
          data: record
        });
      });
    }
  });

  // Add tasks and artifacts as nodes
  tasks.forEach(task => {
    nodes.push({
      id: task.id,
      label: task.title,
      type: "Task",
      status: task.status,
      data: task
    });
    (task.dependencies || []).forEach(depId => {
      edges.push({ from: task.id, to: depId, label: "depends_on" });
    });
  });

  artifacts.forEach(artifact => {
    nodes.push({
      id: artifact.id,
      label: `${artifact.role} Artifact for ${artifact.taskId}`,
      type: "Artifact",
      role: artifact.role,
      data: artifact
    });
    edges.push({ from: artifact.id, to: artifact.taskId, label: "generated_for_task" });
  });

  // Detect recurring patterns (simplified example)
  const patternCounts = {};
  memory.bugs.forEach(bug => {
    const rootCause = bug.rootCause?.toLowerCase() || "";
    if (rootCause.length > 20) {
      patternCounts[rootCause] = (patternCounts[rootCause] || 0) + 1;
    }
  });

  const recurringPatterns = Object.entries(patternCounts)
    .filter(([, count]) => count > 1)
    .map(([pattern]) => ({
      type: "RecurringFailurePattern",
      description: `Recurring root cause: ${pattern}`
    }));

  return {
    nodes,
    edges,
    recurringPatterns,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildKnowledgeGraph,
  loadMemory,
  loadTasks,
  extractADRs,
  extractCompletedTasks,
  extractArtifactSummaries
};
