const path = require("path");

const {
  readJson,
  loadSchema,
  validateSchema,
  addError,
  addWarning
} = require("./validation-utils");

function validateTasks(rootDir, projectDir, report) {
  const tasksFile = readJson(path.join(projectDir, "tasks", "tasks.json"));

  const tasks = tasksFile.tasks || [];

  const schema = loadSchema(rootDir, "task.schema.json");

  const ids = new Set();

  const titles = new Set();

  tasks.forEach(task => {
    const result = validateSchema(task, schema);

    if (!result.valid) {
      result.errors.forEach(error => {
        addError(report, `${task.id}: ${error.instancePath} ${error.message}`);
      });
    }

    if (ids.has(task.id)) {
      addError(report, `Duplicate task id: ${task.id}`);
    }

    ids.add(task.id);

    const title = task.title?.trim().toLowerCase();

    if (titles.has(title)) {
      addWarning(report, `Duplicate title: ${task.title}`);
    }

    titles.add(title);
  });
}

module.exports = {
  validateTasks
};
