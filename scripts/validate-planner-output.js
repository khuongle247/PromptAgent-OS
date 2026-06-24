const path = require("path");

const {
  createReport,
  finalizeReport,
  writeJson
} = require("./validation/validation-utils");

const {
  validatePlannerOutput
} = require("./validation/validate-planner-output");

const projectName =
  process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/validate-planner-output.js ProjectName"
  );

  process.exit(1);
}

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

validatePlannerOutput(
  ROOT,
  projectDir,
  report,
  {
    required: true
  }
);

finalizeReport(
  report
);

writeJson(
  path.join(
    projectDir,
    "reports",
    "planner-report.json"
  ),
  report
);

console.log(
  "\nPLANNER OUTPUT VALIDATION\n"
);

console.log(
  `Status : ${report.status}`
);

console.log(
  `Score  : ${report.score}`
);

if (report.errors.length) {
  console.log("\nERRORS:");

  report.errors.forEach(error => {
    console.log(
      `- ${error}`
    );
  });
}

if (report.warnings.length) {
  console.log("\nWARNINGS:");

  report.warnings.forEach(warning => {
    console.log(
      `- ${warning}`
    );
  });
}

process.exit(
  report.errors.length ? 1 : 0
);
