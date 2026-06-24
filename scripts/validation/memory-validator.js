const path = require("path");

const {
  readJson,
  loadSchema,
  validateSchema,
  addError,
  addWarning
} = require("./validation-utils");

function validateMemory(
  rootDir,
  projectDir,
  report
) {

  const memoryPath = path.join(
    projectDir,
    "memory",
    "memory.json"
  );

  const memory =
    readJson(memoryPath);

  // =====================
  // SCHEMA VALIDATION
  // =====================

  const schema =
    loadSchema(
      rootDir,
      "memory.schema.json"
    );

  const result =
    validateSchema(
      memory,
      schema
    );

  if (!result.valid) {

    result.errors.forEach(
      err => {

        addError(
          report,
          `memory.json: ${err.instancePath} ${err.message}`
        );
      }
    );
  }

  // =====================
  // COMPLETED TASKS
  // =====================

  const completed =
    memory.completedTasks || [];

  const ids =
    new Set();

  completed.forEach(item => {

    if (!item.taskId) {

      addWarning(
        report,
        "Completed task missing taskId"
      );

      return;
    }

    if (
      ids.has(item.taskId)
    ) {

      addWarning(
        report,
        `Duplicate completed task memory: ${item.taskId}`
      );
    }

    ids.add(item.taskId);
  });

  // =====================
  // SIZE CHECK
  // =====================

  if (
    completed.length > 1000
  ) {

    addWarning(
      report,
      "Memory growing large (>1000 completed tasks)"
    );
  }

  return memory;
}

module.exports = {
  validateMemory
};