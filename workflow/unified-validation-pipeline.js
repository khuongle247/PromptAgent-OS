const fs = require("fs");
const path = require("path");

const {
  exists,
  readJson,
  readText,
  loadSchema,
  validateSchema,
  createReport,
  addError,
  addWarning
} = require("../scripts/validation/validation-utils");

function validateFileObject(rootDir, filePath, schemaName, label, report) {
  if (!exists(filePath)) {
    addError(report, `Missing file: ${label}`);
    return null;
  }

  try {
    const data = readJson(filePath);
    const schema = loadSchema(rootDir, schemaName);
    const result = validateSchema(data, schema);

    if (!result.valid) {
      result.errors.forEach(error => {
        addError(report, `${label}: ${error.instancePath} ${error.message}`);
      });
    }

    return data;
  } catch (error) {
    addError(report, `${label}: ${error.message}`);
    return null;
  }
}

function parseJsonFile(filePath) {
  if (!exists(filePath)) {
    return null;
  }

  return readJson(filePath);
}

function validateTasks(tasks, report) {
  const ids = new Set();

  tasks.forEach(task => {
    if (ids.has(task.id)) {
      addError(report, `Duplicate task id: ${task.id}`);
    }
    ids.add(task.id);
  });

  tasks.forEach(task => {
    (task.dependencies || []).forEach(dep => {
      if (!ids.has(dep)) {
        addError(report, `${task.id} depends on missing task ${dep}`);
      }
    });
  });

  const graph = {};
  tasks.forEach(task => {
    graph[task.id] = task.dependencies || [];
  });

  const visiting = new Set();
  const visited = new Set();

  function dfs(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const next of graph[node] || []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  if (Object.keys(graph).some(dfs)) {
    addError(report, "Dependency cycle detected");
  }
}

function validateProjectWorkspace(
  rootDir,
  projectDir,
  report = createReport(path.basename(projectDir))
) {
  const requiredFiles = [
    "project.json",
    "docs/requirements.md",
    "docs/features.md",
    "docs/architecture.md",
    "context/project-context.md",
    "context/tech-stack.md",
    "context/coding-rules.md",
    "context/architecture-rules.md",
    "context/testing-rules.md",
    "context/security-rules.md",
    "context/ai-rules.md",
    "tasks/tasks.json",
    "tasks/current-task.json",
    "memory/memory.json",
    "memory/memory-summary.json"
  ];

  requiredFiles.forEach(relativePath => {
    if (!exists(path.join(projectDir, relativePath))) {
      addError(report, `Missing file: ${relativePath}`);
    }
  });

  const project = validateFileObject(
    rootDir,
    path.join(projectDir, "project.json"),
    "project.schema.json",
    "project.json",
    report
  );
  const tasksFile = parseJsonFile(path.join(projectDir, "tasks", "tasks.json"));
  const memoryFile = parseJsonFile(path.join(projectDir, "memory", "memory.json"));

  if (tasksFile && Array.isArray(tasksFile.tasks)) {
    const taskSchema = loadSchema(rootDir, "task.schema.json");
    tasksFile.tasks.forEach(task => {
      const result = validateSchema(task, taskSchema);
      if (!result.valid) {
        result.errors.forEach(error =>
          addWarning(report, `${task.id || "task"}: ${error.instancePath} ${error.message}`)
        );
      }
    });
    validateTasks(tasksFile.tasks, report);
  } else {
    addError(report, "tasks/tasks.json must contain a tasks array");
  }

  if (memoryFile && memoryFile.schemaVersion === "3.0.0") {
    const memorySchema = loadSchema(rootDir, "memory.schema.json");
    const result = validateSchema(memoryFile, memorySchema);
    if (!result.valid) {
      result.errors.forEach(error =>
        addError(report, `memory.json: ${error.instancePath} ${error.message}`)
      );
    }
  } else if (memoryFile) {
    addWarning(report, "Legacy memory.json detected; strict v3 schema validation skipped");
  }

  return report;
}

function validatePhaseConfiguration(
  rootDir,
  projectDir,
  report = createReport(path.basename(projectDir))
) {
  const phaseGatePath = path.join(rootDir, "schemas", "phase-gates.schema.json");
  const phaseGates = parseJsonFile(phaseGatePath);
  const project = validateFileObject(
    rootDir,
    path.join(projectDir, "project.json"),
    "project.schema.json",
    "project.json",
    report
  );

  if (!phaseGates || !project) {
    return report;
  }

  const currentPhase = Number(project.phase || 1);
  const currentGate = (phaseGates.phases || []).find(phase => phase.phase === currentPhase);

  if (!currentGate) {
    addWarning(report, `No phase gate found for phase ${currentPhase}`);
    return report;
  }

  const evaluate = criterion => {
    const params = criterion.params || {};
    const targetPath = path.join(projectDir, params.path || "");

    switch (criterion.validationType) {
      case "file-exists":
        return exists(targetPath);
      case "schema-valid":
        return exists(targetPath);
      case "content-quality":
        return exists(targetPath) && readText(targetPath).trim().length >= (params.minLength || 50);
      case "count-min": {
        if (!exists(targetPath)) return false;
        try {
          const data = readJson(targetPath);
          const items = params.key ? data[params.key] || [] : data;
          return Array.isArray(items) && items.length >= (params.min || 0);
        } catch {
          return false;
        }
      }
      default:
        return true;
    }
  };

  (currentGate.entryCriteria || []).forEach(criterion => {
    if (!evaluate(criterion)) {
      addError(report, `Entry criterion ${criterion.id} failed: ${criterion.description}`);
    }
  });

  if (currentPhase > 1) {
    const previousGate = (phaseGates.phases || []).find(phase => phase.phase === currentPhase - 1);
    ((previousGate && previousGate.exitCriteria) || []).forEach(criterion => {
      if (!evaluate(criterion)) {
        addError(report, `Exit criterion ${criterion.id} failed: ${criterion.description}`);
      }
    });
  }

  return report;
}

function validateAgentArtifacts(
  rootDir,
  projectDir,
  role,
  report = createReport(path.basename(projectDir))
) {
  const { getRoleConfig } = require("./phase-controller");
  const config = getRoleConfig(role);

  if (!config) {
    addError(report, `Unknown role: ${role}`);
    return report;
  }

  const promptPath = path.join(rootDir, "prompts", config.promptFile);
  if (!exists(promptPath)) {
    addError(report, `Missing prompt: ${config.promptFile}`);
  } else if (readText(promptPath).trim().length < 20) {
    addWarning(report, `Prompt too short: ${config.promptFile}`);
  }

  if (config.contractFile) {
    parseJsonFile(path.join(rootDir, "schemas", "contracts", config.contractFile));
  }

  const outputPath = path.join(projectDir, `${role}-output.json`);
  if (exists(outputPath)) {
    const outputSchema = loadSchema(rootDir, config.outputSchema);
    const outputData = readJson(outputPath);
    const result = validateSchema(outputData, outputSchema);

    if (!result.valid) {
      result.errors.forEach(error =>
        addError(report, `${path.basename(outputPath)}: ${error.instancePath} ${error.message}`)
      );
    }
  } else {
    addWarning(report, `No output artifact found for ${role}`);
  }

  return report;
}

function runUnifiedValidationPipeline(rootDir, projectDir, role) {
  const report = createReport(path.basename(projectDir));
  validateProjectWorkspace(rootDir, projectDir, report);
  validatePhaseConfiguration(rootDir, projectDir, report);
  validateAgentArtifacts(rootDir, projectDir, role, report);
  return report;
}

module.exports = {
  validateProjectWorkspace,
  validatePhaseConfiguration,
  validateAgentArtifacts,
  runUnifiedValidationPipeline
};
