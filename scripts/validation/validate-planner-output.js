const fs = require("fs");
const path = require("path");

const { readJson, loadSchema, validateSchema, addError } = require("./validation-utils");

const { validateDependencyReferences, detectDependencyCycle } = require("../task-engine-v3");

// =====================================

function validatePlannerOutput(rootDir, projectDir, report, options = {}) {
  const required = options.required === true;

  const file = path.join(projectDir, "planner-output.json");

  if (!fs.existsSync(file)) {
    if (required) {
      addError(report, "Missing planner-output.json");
    }

    return false;
  }

  const data = readJson(file);

  // =====================================
  // 1. SCHEMA VALIDATION (HARD GATE)
  // =====================================

  const schema = loadSchema(rootDir, "planner-output.schema.json");

  const result = validateSchema(data, schema);

  if (!result.valid) {
    result.errors.forEach(err => {
      addError(report, `planner-output.json: ${err.instancePath} ${err.message}`);
    });

    return false;
  }

  // =====================================
  // 2. BASIC STRUCTURE CHECK
  // =====================================

  if (!data.tasks || data.tasks.length === 0) {
    addError(report, "Planner output has no tasks");

    return false;
  }

  // =====================================
  // 3. TASK QUALITY CHECK
  // =====================================

  const titles = new Set();

  const ids = new Set();

  for (const task of data.tasks) {
    if (ids.has(task.id)) {
      addError(report, `Duplicate task id in planner output: ${task.id}`);
    }

    ids.add(task.id);

    const title = task.title.trim().toLowerCase();

    if (titles.has(title)) {
      addError(report, `Duplicate task title in planner output: ${task.title}`);
    }

    titles.add(title);

    if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
      addError(report, `Task missing acceptance criteria: ${task.title}`);
    }

    if (!["P1", "P2", "P3"].includes(task.priority)) {
      addError(report, `Invalid priority: ${task.title}`);
    }

    if (!Array.isArray(task.dependencies)) {
      addError(report, `Dependencies must be array: ${task.title}`);
    } else if (task.dependencies.includes(task.id)) {
      addError(report, `${task.id} cannot depend on itself`);
    }
  }

  // =====================================
  // 4. DEPENDENCY VALIDATION
  // =====================================

  const dependencyErrors = validateDependencyReferences(data.tasks);

  dependencyErrors.forEach(error => addError(report, error));

  // =====================================
  // 5. CYCLE CHECK
  // =====================================

  const hasCycle = detectDependencyCycle(data.tasks);

  if (hasCycle) {
    addError(report, "Cycle detected in planner output");
  }

  // =====================================
  // RESULT
  // =====================================

  return report.errors.length === 0;
}

module.exports = {
  validatePlannerOutput
};
