const fs = require("fs");
const path = require("path");

const {
  createReport,
  finalizeReport,
  writeJson
} = require("./validation/validation-utils");

const {
  validateProject
} = require("./validation/project-validator");

const {
  validateTasks
} = require("./validation/task-validator");

const {
  validateDependencies
} = require("./validation/dependency-validator");

const {
  validateMilestones
} = require("./validation/milestone-manager");

const {
  validateMemory
} = require("./validation/memory-validator");

const {
  validateSummary
} = require("./validation/summary-validator");

const {
  validatePlannerOutput
} = require("./validation/validate-planner-output");

// =====================================

const projectName =
  process.argv[2];

if (!projectName) {

  console.log(
    "Usage: node scripts/validate-project-v2.js ProjectName"
  );

  process.exit(1);
}

// =====================================

const ROOT =
  process.cwd();

const projectDir =
  path.join(
    ROOT,
    "projects",
    projectName
  );

const report =
  createReport(
    projectName
  );

// =====================================

try {

  validateProject(
    ROOT,
    projectDir,
    report
  );

  validateTasks(
    ROOT,
    projectDir,
    report
  );

  validateDependencies(
    projectDir,
    report
  );

  validateMilestones(
    ROOT,
    projectDir,
    report
  );

  validateMemory(
    ROOT,
    projectDir,
    report
  );

  validateSummary(
    projectDir,
    report
  );

  validatePlannerOutput(
    ROOT,
    projectDir,
    report
  );

  finalizeReport(
    report
  );

  const reportFile =
    path.join(
      projectDir,
      "validation-report.json"
    );

  writeJson(
    reportFile,
    report
  );

  console.log("\n================================");
  console.log("VALIDATION REPORT");
  console.log("================================");

  console.log(
    `Status : ${report.status}`
  );

  console.log(
    `Score  : ${report.score}`
  );

  console.log(
    `Errors : ${report.errors.length}`
  );

  console.log(
    `Warnings : ${report.warnings.length}`
  );

  if (
    report.errors.length
  ) {

    console.log("\nERRORS:");

    report.errors.forEach(
      e =>
        console.log(
          "-",
          e
        )
    );
  }

  if (
    report.warnings.length
  ) {

    console.log("\nWARNINGS:");

    report.warnings.forEach(
      w =>
        console.log(
          "-",
          w
        )
    );
  }

} catch (error) {

  console.error(
    "\nValidation crashed:\n"
  );

  console.error(
    error.message
  );

  process.exit(1);
}
