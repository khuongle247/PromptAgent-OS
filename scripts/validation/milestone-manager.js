const path = require("path");

const {
  exists,
  readJson,
  loadSchema,
  validateSchema,
  addError,
  addWarning
} = require("./validation-utils");

function validateMilestones(rootDir, projectDir, report) {
  const file = path.join(projectDir, "tasks", "milestones.json");

  if (!exists(file)) {
    addError(report, "Missing milestones.json");

    return;
  }

  const data = readJson(file);

  const schema = loadSchema(rootDir, path.join("milestone", "schema.json"));

  const result = validateSchema(data, schema);

  if (!result.valid) {
    result.errors.forEach(error => {
      addError(report, `milestones.json: ${error.instancePath} ${error.message}`);
    });
  }

  const tasksFile = path.join(projectDir, "tasks", "tasks.json");

  if (!exists(tasksFile)) {
    return;
  }

  const taskIds = new Set((readJson(tasksFile).tasks || []).map(task => task.id));

  const milestoneIds = new Set();

  (data.milestones || []).forEach(milestone => {
    if (milestoneIds.has(milestone.id)) {
      addError(report, `Duplicate milestone id: ${milestone.id}`);
    }

    milestoneIds.add(milestone.id);

    if (!milestone.tasks || milestone.tasks.length === 0) {
      addWarning(report, `Milestone has no tasks: ${milestone.id}`);
    }

    (milestone.tasks || []).forEach(taskId => {
      if (!taskIds.has(taskId)) {
        addError(report, `${milestone.id} references missing task ${taskId}`);
      }
    });
  });
}

module.exports = {
  validateMilestones
};
