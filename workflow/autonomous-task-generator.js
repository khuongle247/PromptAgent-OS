const fs = require("fs");
const path = require("path");

const { executeAgent } = require("./agent-executor");
const { listArtifacts } = require("./artifact-store");
const { setCurrentAgent, setAgentStatus, loadState } = require("./state-manager");

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function readTextSafe(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch (error) {
    return "";
  }
}

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[-*\d.\[\]x\s]+/, "")
    .trim();
}

function extractMarkdownSignals(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^#{1,3}\s+|^[-*]\s+|^\d+\.\s+/.test(line))
    .map(line => normalizeText(line))
    .filter(line => line.length >= 10);
}

function extractMemorySignals(memory) {
  if (!memory || typeof memory !== "object") {
    return [];
  }

  const buckets = [
    memory.importantDecisions,
    memory.importantConventions,
    memory.recentTasks,
    memory.knownBugs,
    memory.risks,
    memory.decisions,
    memory.architecture,
    memory.completedTasks,
    memory.conventions
  ];

  return buckets
    .flatMap(bucket => Array.isArray(bucket) ? bucket : [])
    .map(entry => {
      if (typeof entry === "string") {
        return normalizeText(entry);
      }

      if (entry && typeof entry === "object") {
        return normalizeText(entry.title || entry.description || entry.summary || entry.name || entry.taskId || entry.id);
      }

      return "";
    })
    .filter(signal => signal.length >= 10);
}

function deriveModule(signal) {
  const lower = signal.toLowerCase();

  if (/(auth|login|session|user)/.test(lower)) return "auth";
  if (/(api|endpoint|contract|schema)/.test(lower)) return "api";
  if (/(ui|screen|view|page|layout|widget)/.test(lower)) return "ui";
  if (/(data|db|storage|repository|model)/.test(lower)) return "data";
  if (/(test|spec|verification|validation)/.test(lower)) return "testing";
  if (/(security|permission|authz|risk)/.test(lower)) return "security";
  if (/(infra|workflow|pipeline|orchestrator|state)/.test(lower)) return "workflow";

  return "general";
}

function deriveAssignee(module) {
  if (module === "workflow" || module === "security") {
    return "architect";
  }

  if (module === "testing") {
    return "reviewer";
  }

  return "coder";
}

function getNextTaskId(existingTasks, offset) {
  const maxNumber = existingTasks.reduce((max, task) => {
    const match = String(task.id || "").match(/TASK-(\d+)/);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `TASK-${String(maxNumber + offset + 1).padStart(3, "0")}`;
}

function createTaskFromSignal(signal, index, existingTasks, previousTaskId) {
  const cleaned = normalizeText(signal);
  const module = deriveModule(cleaned);
  const title = cleaned.length >= 10 ? cleaned.slice(0, 80) : `${cleaned} implementation`;
  const taskId = getNextTaskId(existingTasks, index);

  return {
    id: taskId,
    title: title.length >= 10 ? title : `${title} implementation`,
    module,
    priority: index === 0 ? "P1" : "P2",
    status: "todo",
    dependencies: previousTaskId ? [previousTaskId] : [],
    acceptanceCriteria: [
      `Implement ${title}.`,
      `Validate ${title} against existing project constraints.`,
      `Persist the result through the existing planner flow.`
    ],
    definitionOfDone: [
      `The task output is schema-compliant for the planner stage.`,
      `The task is ready for downstream architecture review.`
    ],
    estimate: index % 3 === 0 ? "4h" : "2h",
    assignee: deriveAssignee(module),
    description: `Generated from legacy memory, requirements, and architecture signals: ${title}.`
  };
}

function chunkTasks(tasks, size) {
  const chunks = [];
  for (let index = 0; index < tasks.length; index += size) {
    chunks.push(tasks.slice(index, index + size));
  }
  return chunks;
}

function buildMilestones(tasks) {
  return chunkTasks(tasks, 4).map((chunk, index) => ({
    id: `MS-${String(index + 1).padStart(3, "0")}`,
    title: `Autonomous Planning Wave ${index + 1}`,
    description: `Task bundle generated from project requirements and architecture signals for wave ${index + 1}.`,
    tasks: chunk.map(task => task.id),
    targetDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "planned"
  }));
}

const { analyzeExecutionResults } = require("./learning-loop-engine");
const { retrieveMemories } = require("./memory-retrieval-engine");
const { readJsonSafe, readTextSafe } = require("../scripts/validation/validation-utils");

function collectSignals(rootDir, projectDir) {
  const requirements = readTextSafe(path.join(projectDir, "docs", "requirements.md"));
  const architecture = readTextSafe(path.join(projectDir, "docs", "architecture.md"));
  const memorySummary = readJsonSafe(path.join(projectDir, "memory", "memory-summary.json"));
  const existingTasksFile = readJsonSafe(path.join(projectDir, "tasks", "tasks.json"));
  const existingTasks = Array.isArray(existingTasksFile?.tasks) ? existingTasksFile.tasks : [];

  const signals = [
    ...extractMarkdownSignals(requirements),
    ...extractMarkdownSignals(architecture),
    ...extractMemorySignals(memorySummary)
  ];

  // Incorporate reusable lessons learned from the learning loop (if any)
  const lessonsLearned = retrieveMemories(rootDir, projectDir, "reusable lessons learned", { type: "convention", limit: 5 }); // Example usage
  lessonsLearned.forEach(lesson => signals.push(lesson.description));

  const uniqueSignals = [];
  const seen = new Set();
  for (const signal of signals) {
    const key = signal.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueSignals.push(signal);
  }

  return {
    existingTasks,
    signals: uniqueSignals.length ? uniqueSignals : [normalizeText(`${path.basename(rootDir)} planning bootstrap`)],
    memorySummary
  };
}

function buildPlannerOutput(rootDir, projectDir, options = {}) {
  const { existingTasks, signals, memory } = collectSignals(rootDir, projectDir);
  const maxTasks = Math.min(20, Math.max(1, Number(options.maxTasks || signals.length)));
  const selectedSignals = signals.slice(0, maxTasks);

  const generatedTasks = selectedSignals.map((signal, index) => {
    const previousTaskId = index > 0 ? getNextTaskId(existingTasks, index - 1) : (existingTasks[existingTasks.length - 1]?.id || null);
    return createTaskFromSignal(signal, index, existingTasks, previousTaskId);
  });

  return {
    metadata: {
      plannerVersion: options.plannerVersion || "autonomous-task-generator",
      generatedAt: new Date().toISOString(),
      source: options.source || "system",
      taskCount: generatedTasks.length,
      assumptions: ["Generated automatically from requirements, architecture, and memory signals."]
    },
    tasks: generatedTasks.map(task => ({
      id: task.id,
      title: task.title,
      module: task.module,
      priority: task.priority,
      status: task.status,
      dependencies: task.dependencies,
      acceptanceCriteria: task.acceptanceCriteria,
      definitionOfDone: task.definitionOfDone,
      estimate: task.estimate,
      assignee: task.assignee,
      description: task.description
    })),
    milestones: buildMilestones(generatedTasks),
    risks: Array.isArray(memory?.risks) ? memory.risks : []
  };
}

async function feedPlanner(rootDir, projectName, options = {}) {
  const projectDir = getProjectDir(rootDir, projectName);
  const state = loadState(projectDir);
  const plannerOutput = buildPlannerOutput(rootDir, projectDir, options);

  setCurrentAgent(projectDir, "planner", {
    phase: state.phase,
    status: "active",
    retryCount: 0
  });

  const plannerExecution = await executeAgent(rootDir, projectDir, "planner", {
    taskId: options.taskId || plannerOutput.tasks[0]?.id || "TASK-001",
    llmClient: async () => plannerOutput
  });

  setAgentStatus(projectDir, "planner", plannerExecution.ok ? "completed" : "failed", plannerExecution.validation.errors[0] || "Autonomous planner generation failed.", {
    phase: state.phase,
    retryCount: state.retryCount || 0
  });

  return {
    projectName,
    projectDir,
    state: loadState(projectDir),
    plannerOutput,
    plannerExecution,
    generatedTaskCount: plannerOutput.tasks.length,
    artifactCount: listArtifacts(projectDir, { role: "planner" }).length
  };
}

module.exports = {
  getProjectDir,
  readJsonSafe,
  readTextSafe,
  normalizeText,
  extractMarkdownSignals,
  extractMemorySignals,
  deriveModule,
  deriveAssignee,
  getNextTaskId,
  createTaskFromSignal,
  buildMilestones,
  collectSignals,
  buildPlannerOutput,
  feedPlanner
};

if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.log("Usage: node workflow/autonomous-task-generator.js ProjectName");
    process.exit(1);
  }

  feedPlanner(process.cwd(), projectName)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.plannerExecution.ok ? 0 : 1);
    })
    .catch(error => {
      console.error(error.stack || error.message);
      process.exit(1);
    });
}