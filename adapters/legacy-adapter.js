const path = require("path");

function asText(input) {
  if (typeof input === "string") {
    return input;
  }

  if (input && typeof input === "object") {
    return JSON.stringify(input, null, 2);
  }

  return "";
}

function nowIso() {
  return new Date().toISOString();
}

function datePlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeTask(task, index, defaultAssignee) {
  const title = String(task.title || task.name || task.summary || task.label || `Legacy Task ${index + 1}`).trim() || `Legacy Task ${index + 1}`;
  const id = String(task.id || task.taskId || `TASK-${String(index + 1).padStart(3, "0")}`);
  const dependencies = Array.isArray(task.dependencies) ? task.dependencies.map(String) : [];
  const acceptanceCriteria = Array.isArray(task.acceptanceCriteria) && task.acceptanceCriteria.length
    ? task.acceptanceCriteria.map(item => String(item))
    : [
      `Task ${title} can be executed successfully.`,
      `Output remains valid against the planner schema.`,
      `Dependencies are resolved before execution starts.`
    ];

  const definitionOfDone = Array.isArray(task.definitionOfDone) && task.definitionOfDone.length
    ? task.definitionOfDone.map(item => String(item))
    : [
      `Implementation for ${title} is complete.`,
      `Validation has been executed and passed.`
    ];

  return {
    id,
    title,
    module: String(task.module || task.area || task.group || "general"),
    priority: String(task.priority || "P2"),
    status: String(task.status || "todo"),
    dependencies,
    acceptanceCriteria,
    definitionOfDone,
    estimate: String(task.estimate || "4h"),
    assignee: String(task.assignee || defaultAssignee || "coder"),
    milestoneId: task.milestoneId ? String(task.milestoneId) : undefined,
    description: String(task.description || title),
    technicalNotes: task.technicalNotes ? String(task.technicalNotes) : undefined
  };
}

function normalizeMilestone(milestone, index, taskIds) {
  const title = String(milestone.title || milestone.name || `Legacy Milestone ${index + 1}`).trim() || `Legacy Milestone ${index + 1}`;
  return {
    id: String(milestone.id || `MS-${String(index + 1).padStart(3, "0")}`),
    title,
    description: String(milestone.description || `Converted legacy milestone for ${title}.`),
    tasks: Array.isArray(milestone.tasks) && milestone.tasks.length ? milestone.tasks.map(String) : taskIds.slice(),
    targetDate: milestone.targetDate || datePlusDays(7),
    status: milestone.status || "planned"
  };
}

function extractChecklistItems(markdown) {
  return asText(markdown)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^[-*]\s+|^\d+\.\s+|^\[\s*[x ]\s*\]\s+/i.test(line))
    .map(line => line.replace(/^[-*]\s+|^\d+\.\s+|^\[\s*[x ]\s*\]\s+/i, "").trim())
    .filter(Boolean);
}

function extractHeadings(markdown) {
  return asText(markdown)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^#{1,3}\s+/.test(line))
    .map(line => line.replace(/^#{1,3}\s+/, "").trim())
    .filter(Boolean);
}

function parseMarkdownToPlannerOutput(markdown, options = {}) {
  const items = extractChecklistItems(markdown);
  const headings = extractHeadings(markdown);
  const baseTitle = headings[0] || options.title || "Legacy Planning Output";
  const tasks = (items.length ? items : [baseTitle]).map((item, index) => normalizeTask({
    title: item,
    module: options.module || "general",
    priority: options.priority || "P2",
    status: "todo",
    dependencies: []
  }, index, options.assignee || "coder"));

  const taskIds = tasks.map(task => task.id);

  return {
    metadata: {
      plannerVersion: options.plannerVersion || "legacy-adapter",
      generatedAt: nowIso(),
      source: options.source || "system",
      taskCount: tasks.length,
      assumptions: ["Converted from legacy markdown format."]
    },
    tasks,
    milestones: [normalizeMilestone({ title: `${baseTitle} Milestone`, tasks: taskIds }, 0, taskIds)],
    risks: []
  };
}

function parseMarkdownToArchitectOutput(markdown, options = {}) {
  const headings = extractHeadings(markdown);
  const title = headings[0] || options.title || "Legacy Architecture Output";
  const taskId = options.taskId || "TASK-001";

  return {
    metadata: {
      architectVersion: options.architectVersion || "legacy-adapter",
      generatedAt: nowIso(),
      adrCount: 1
    },
    decisions: [
      {
        adrId: "ADR-001",
        title: title.slice(0, 80),
        context: `Converted from legacy markdown content for ${title}.`,
        decision: `Preserve the legacy architecture intent and normalize it into the current architect output schema.`,
        consequences: `The converted decision can now pass through the existing validation and execution flow.`,
        status: "proposed",
        relatedTasks: [taskId]
      }
    ],
    architectureUpdates: [
      {
        file: "docs/architecture.md",
        content: `Legacy architecture content converted for ${title}.`
      }
    ],
    taskAssignments: [
      {
        taskId,
        adrReferences: ["ADR-001"],
        implementationGuidance: `Apply the normalized architecture guidance for ${title}.`
      }
    ],
    risks: []
  };
}

function parseMarkdownToCoderOutput(markdown, options = {}) {
  const taskId = options.taskId || "TASK-001";
  const fileMatches = asText(markdown).match(/\b[a-zA-Z0-9_./-]+\.(?:js|ts|dart|java|kt|md|json|yaml|yml|py|go|cs)\b/g) || [];
  const files = fileMatches.length ? Array.from(new Set(fileMatches)) : ["src/legacy-output.txt"];

  return {
    metadata: {
      coderVersion: options.coderVersion || "legacy-adapter",
      generatedAt: nowIso(),
      taskId
    },
    taskId,
    filesChanged: files.map(filePath => ({
      path: filePath,
      changeType: "modified",
      summary: `Converted from legacy markdown for task ${taskId}.`
    })),
    testResults: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      details: []
    },
    lintResults: {
      passed: true,
      errors: 0,
      warnings: 0
    },
    memoryUpdates: []
  };
}

function parseMarkdownToReviewerOutput(markdown, options = {}) {
  const taskId = options.taskId || "TASK-001";
  const lines = asText(markdown)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const reviewItems = lines.length
    ? [{
        category: "style",
        severity: "P3-minor",
        description: lines[0].slice(0, 120),
        location: options.location || "legacy",
        actionable: false,
        suggestion: "Legacy review notes converted to the new schema."
      }]
    : [{
        category: "architecture-compliance",
        severity: "P4-suggestion",
        description: "Legacy reviewer content converted without structured review items.",
        location: options.location || "legacy",
        actionable: false,
        suggestion: "No action required."
      }];

  return {
    metadata: {
      reviewerVersion: options.reviewerVersion || "legacy-adapter",
      generatedAt: nowIso(),
      taskId
    },
    taskId,
    decision: options.decision || "approved",
    reviewItems,
    summary: `Converted legacy markdown review content for ${taskId}.`,
    acceptanceVerification: [],
    memoryUpdates: []
  };
}

function normalizeLegacyJsonByRole(role, data, options = {}) {
  if (role === "planner") {
    const tasks = Array.isArray(data.tasks) ? data.tasks.map((task, index) => normalizeTask(task, index, options.assignee || "coder")) : [];
    const taskIds = tasks.map(task => task.id);

    return {
      metadata: {
        plannerVersion: data.metadata?.plannerVersion || data.plannerVersion || "legacy-adapter",
        generatedAt: data.metadata?.generatedAt || data.generatedAt || nowIso(),
        source: data.metadata?.source || data.source || "system",
        taskCount: tasks.length,
        assumptions: Array.isArray(data.metadata?.assumptions) ? data.metadata.assumptions : []
      },
      tasks,
      milestones: Array.isArray(data.milestones) && data.milestones.length
        ? data.milestones.map((milestone, index) => normalizeMilestone(milestone, index, taskIds))
        : [normalizeMilestone({ title: options.title || "Legacy Planning Milestone", tasks: taskIds }, 0, taskIds)],
      risks: Array.isArray(data.risks) ? data.risks : []
    };
  }

  if (role === "architect") {
    const taskId = options.taskId || data.metadata?.taskId || data.taskId || "TASK-001";
    const decisions = Array.isArray(data.decisions) && data.decisions.length
      ? data.decisions.map((decision, index) => ({
          adrId: String(decision.adrId || `ADR-${String(index + 1).padStart(3, "0")}`),
          title: String(decision.title || decision.name || `Legacy Decision ${index + 1}`),
          context: String(decision.context || decision.description || "Converted legacy architecture decision."),
          decision: String(decision.decision || decision.result || "Converted legacy decision into current schema."),
          consequences: String(decision.consequences || decision.impact || "Converted legacy decision consequences."),
          status: decision.status === "accepted" ? "accepted" : "proposed",
          relatedTasks: Array.isArray(decision.relatedTasks) ? decision.relatedTasks.map(String) : [taskId]
        }))
      : [parseMarkdownToArchitectOutput("Legacy architecture content", { taskId }).decisions[0]];

    return {
      metadata: {
        architectVersion: data.metadata?.architectVersion || data.architectVersion || "legacy-adapter",
        generatedAt: data.metadata?.generatedAt || data.generatedAt || nowIso(),
        adrCount: decisions.length
      },
      decisions,
      architectureUpdates: Array.isArray(data.architectureUpdates) && data.architectureUpdates.length
        ? data.architectureUpdates
        : [{ file: "docs/architecture.md", content: `Converted legacy architecture content for ${taskId}.` }],
      taskAssignments: Array.isArray(data.taskAssignments) && data.taskAssignments.length
        ? data.taskAssignments
        : [{ taskId, adrReferences: decisions.map(decision => decision.adrId), implementationGuidance: `Execute the converted architecture guidance for ${taskId}.` }],
      risks: Array.isArray(data.risks) ? data.risks : []
    };
  }

  if (role === "coder") {
    const taskId = options.taskId || data.metadata?.taskId || data.taskId || "TASK-001";
    const filesChanged = Array.isArray(data.filesChanged) && data.filesChanged.length
      ? data.filesChanged
      : [{ path: "src/legacy-output.txt", changeType: "modified", summary: "Converted legacy coder output." }];

    return {
      metadata: {
        coderVersion: data.metadata?.coderVersion || data.coderVersion || "legacy-adapter",
        generatedAt: data.metadata?.generatedAt || data.generatedAt || nowIso(),
        taskId
      },
      taskId,
      filesChanged,
      testResults: data.testResults || { total: 0, passed: 0, failed: 0, skipped: 0, details: [] },
      lintResults: data.lintResults || { passed: true, errors: 0, warnings: 0 },
      memoryUpdates: Array.isArray(data.memoryUpdates) ? data.memoryUpdates : [],
      acceptanceVerification: Array.isArray(data.acceptanceVerification) ? data.acceptanceVerification : [],
      decisions: Array.isArray(data.decisions) ? data.decisions : []
    };
  }

  if (role === "reviewer") {
    const taskId = options.taskId || data.metadata?.taskId || data.taskId || "TASK-001";
    const reviewItems = Array.isArray(data.reviewItems) && data.reviewItems.length
      ? data.reviewItems
      : [{
          category: "style",
          severity: "P3-minor",
          description: "Converted legacy reviewer output.",
          location: options.location || "legacy",
          actionable: false,
          suggestion: "Review the converted reviewer output.",
        }];

    return {
      metadata: {
        reviewerVersion: data.metadata?.reviewerVersion || data.reviewerVersion || "legacy-adapter",
        generatedAt: data.metadata?.generatedAt || data.generatedAt || nowIso(),
        taskId
      },
      taskId,
      decision: data.decision || "approved",
      reviewItems,
      summary: String(data.summary || `Converted legacy reviewer output for ${taskId}.`),
      acceptanceVerification: Array.isArray(data.acceptanceVerification) ? data.acceptanceVerification : [],
      memoryUpdates: Array.isArray(data.memoryUpdates) ? data.memoryUpdates : []
    };
  }

  return data;
}

function detectRole(input, options = {}) {
  if (options.role) {
    return options.role;
  }

  const text = asText(input).toLowerCase();

  if (/review item|changes-requested|approved|reviewer/.test(text)) return "reviewer";
  if (/files changed|test results|lint results|memory updates/.test(text)) return "coder";
  if (/adr-|architecture update|task assignments/.test(text)) return "architect";
  return "planner";
}

function adaptLegacyArtifact(input, options = {}) {
  const role = detectRole(input, options);
  const text = asText(input).trim();

  if (!text) {
    return normalizeLegacyJsonByRole(role, {}, options);
  }

  if (/^\s*[\[{]/.test(text)) {
    try {
      const data = typeof input === "object" && input !== null ? input : JSON.parse(text);
      return normalizeLegacyJsonByRole(role, data, options);
    } catch (error) {
      return role === "planner"
        ? parseMarkdownToPlannerOutput(text, options)
        : role === "architect"
          ? parseMarkdownToArchitectOutput(text, options)
          : role === "coder"
            ? parseMarkdownToCoderOutput(text, options)
            : parseMarkdownToReviewerOutput(text, options);
    }
  }

  return role === "planner"
    ? parseMarkdownToPlannerOutput(text, options)
    : role === "architect"
      ? parseMarkdownToArchitectOutput(text, options)
      : role === "coder"
        ? parseMarkdownToCoderOutput(text, options)
        : parseMarkdownToReviewerOutput(text, options);
}

function adaptLegacyMarkdown(markdown, options = {}) {
  return adaptLegacyArtifact(markdown, options);
}

function adaptLegacyJson(jsonInput, options = {}) {
  return adaptLegacyArtifact(jsonInput, options);
}

module.exports = {
  adaptLegacyArtifact,
  adaptLegacyMarkdown,
  adaptLegacyJson,
  detectRole,
  normalizeLegacyJsonByRole,
  normalizeTask,
  normalizeMilestone,
  parseMarkdownToPlannerOutput,
  parseMarkdownToArchitectOutput,
  parseMarkdownToCoderOutput,
  parseMarkdownToReviewerOutput
};