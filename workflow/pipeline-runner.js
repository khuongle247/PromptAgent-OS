const fs = require("fs");
const path = require("path");

const { createReport } = require("../scripts/validation/validation-utils");
const { runUnifiedValidationPipeline } = require("./unified-validation-pipeline");
const { getCurrentWorkflowState, getNextRole } = require("./phase-controller");
const { runAgent } = require("./agent-runner");
const { initializeEngines } = require("../scripts/event-integration");
const eventBus = require("./event-bus");

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function runPipeline(rootDir, projectName) {
  // Initialize Phase 7 engines on first pipeline run
  initializeEngines(eventBus);

  const projectDir = path.join(rootDir, "projects", projectName);
  const report = createReport(projectName);
  const projectPath = path.join(projectDir, "project.json");

  if (!fs.existsSync(projectPath)) {
    return { ready: false, status: "missing-project", report };
  }

  const project = readJsonSafe(projectPath);
  if (!project) {
    return {
      ready: false,
      status: "invalid-project",
      projectName,
      projectDir,
      report,
      error: "project.json is empty or invalid"
    };
  }
  const workflowState = getCurrentWorkflowState(project);
  const validationReport = runUnifiedValidationPipeline(
    rootDir,
    projectDir,
    workflowState.currentRole
  );
  const agentReport = runAgent(rootDir, projectDir, workflowState.currentRole);

  const ready = validationReport.errors.length === 0 && agentReport.promptReady;

  return {
    ready,
    status: ready ? "ready" : "blocked",
    projectName,
    projectDir,
    workflowState,
    nextRole: getNextRole(workflowState.currentRole),
    validationReport,
    agentReport
  };
}

if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.log("Usage: node workflow/pipeline-runner.js ProjectName");
    process.exit(1);
  }

  try {
    const result = runPipeline(process.cwd(), projectName);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ready ? 0 : 1);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  runPipeline
};
