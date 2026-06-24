const path = require("path");

const {
  exists,
  readJson,
  readText,
  loadSchema,
  validateSchema,
  addError,
  addWarning
} = require("./validation-utils");

function validateProject(
  rootDir,
  projectDir,
  report
) {

  const projectFile =
    path.join(
      projectDir,
      "project.json"
    );

  if (!exists(projectFile)) {
    addError(
      report,
      "Missing project.json"
    );

    return;
  }

  const project =
    readJson(projectFile);

  const schema =
    loadSchema(
      rootDir,
      "project.schema.json"
    );

  const result =
    validateSchema(
      project,
      schema
    );

  if (!result.valid) {

    result.errors.forEach(
      error => {

        addError(
          report,
          `project.json: ${error.instancePath} ${error.message}`
        );
      }
    );
  }

  const requiredDocs = [
    "requirements.md",
    "features.md",
    "architecture.md"
  ];

  requiredDocs.forEach(
    file => {

      const fullPath =
        path.join(
          projectDir,
          "docs",
          file
        );

      if (
        !exists(fullPath)
      ) {

        addError(
          report,
          `Missing docs/${file}`
        );

        return;
      }

      const content =
        readText(
          fullPath
        ).trim();

      if (
        content.length < 50
      ) {

        addWarning(
          report,
          `${file} appears empty`
        );
      }
    }
  );
}

module.exports = {
  validateProject
};