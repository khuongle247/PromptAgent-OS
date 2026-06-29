/**
 * Agent Context Propagator
 * Framework-level context propagation between agent handoffs.
 * Packages project metadata, memory, previous outputs, and contracts.
 */
const fs = require("fs");
const path = require("path");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function buildAgentContext(projectDir, rootDir, sourceAgent, targetAgent) {
  const context = {
    schemaVersion: "1.0.0",
    sourceAgent,
    targetAgent,
    generatedAt: new Date().toISOString(),
    project: null,
    memory: null,
    previousOutput: null,
    contract: null,
    environment: {
      rootDir,
      projectDir,
      nodeVersion: process.version
    }
  };

  // Load project metadata
  const projectPath = path.join(projectDir, "project.json");
  if (fileExists(projectPath)) {
    context.project = loadJson(projectPath);
  }

  // Load memory summary
  const memoryPath = path.join(projectDir, "memory", "memory-summary.json");
  if (fileExists(memoryPath)) {
    context.memory = loadJson(memoryPath);
  }

  // Load previous agent output based on source agent
  const outputMap = {
    planner: "planner-output.json",
    architect: "architect-output.json",
    coder: "coder-output.json",
    reviewer: "reviewer-output.json",
    debugger: "debugger-output.json"
  };
  if (outputMap[sourceAgent]) {
    const outputPath = path.join(projectDir, outputMap[sourceAgent]);
    if (fileExists(outputPath)) {
      context.previousOutput = loadJson(outputPath);
    }
  }

  // Load handoff contract
  const contractName = `${sourceAgent}-to-${targetAgent}`;
  const contractPath = path.join(rootDir, "schemas", "contracts", `${contractName}.schema.json`);
  if (fileExists(contractPath)) {
    context.contract = loadJson(contractPath);
  }

  return context;
}

module.exports = { buildAgentContext };
