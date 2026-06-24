const path = require("path");

const {
  readJson,
  writeJson,
  loadSchema,
  validateSchema,
  addError
} = require("./validation/validation-utils");

function validateMilestones(
  rootDir,
  projectDir,
  report
) {

  const file =
    path.join(
      projectDir,
      "tasks",
      "milestones.json"
    );

  if (!require("fs").existsSync(file)) {
    addError(
      report,
      "Missing milestones.json"
    );
    return;
  }

  const data =
    readJson(file);

  const schema =
    loadSchema(
      rootDir,
      "milestone.schema.json"
    );

  const result =
    validateSchema(
      data,
      schema
    );

  if (!result.valid) {

    result.errors.forEach(e => {

      addError(
        report,
        `milestones.json: ${e.instancePath} ${e.message}`
      );
    });
  }
}

module.exports = {
  validateMilestones
};