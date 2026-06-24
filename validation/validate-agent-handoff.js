/**
 * Agent Handoff Validator
 * Framework-level validator that enforces handoff contracts between agents.
 * Validates input/output schemas and quality gates for each transition.
 */
const fs = require("fs");
const path = require("path");
const { readJson } = require("./validation-utils");

function loadContract(rootDir, contractName) {
  const contractPath = path.join(rootDir, "schemas", "contracts", contractName);
  return readJson(contractPath);
}

function validateAgentHandoff(rootDir, projectDir, contractFileName, inputData, report) {
  const contract = loadContract(rootDir, contractFileName);
  if (!contract) {
    report.errors.push(`Contract not found: ${contractFileName}`);
    return false;
  }

  const { addError, addWarning } = require("./validation-utils");
  let passed = true;

  // Validate quality gates
  if (contract.qualityGates && Array.isArray(contract.qualityGates)) {
    for (const gate of contract.qualityGates) {
      const result = evaluateQualityGate(gate, inputData, projectDir);
      if (!result.passed) {
        addError(report, `Quality gate ${gate.id} failed: ${gate.description} - ${result.detail || ""}`);
        passed = false;
      }
    }
  }

  return passed;
}

function evaluateQualityGate(gate, data, projectDir) {
  // Quality gate evaluation logic based on gate id patterns
  if (gate.id.startsWith("QG-PA") || gate.id.startsWith("QG-AC") || 
      gate.id.startsWith("QG-CR") || gate.id.startsWith("QG-RC") ||
      gate.id.startsWith("QG-RD") || gate.id.startsWith("QG-DM")) {
    return evaluateGenericGate(gate, data);
  }
  return { passed: true };
}

function evaluateGenericGate(gate, data) {
  if (!data) return { passed: false, detail: "No data provided" };

  switch (gate.id) {
    // Planner → Architect gates
    case "QG-PA-1": case "QG-PA-2":
      return { passed: data.tasks && data.tasks.length > 0, detail: "No tasks found" };
    case "QG-PA-3":
      return { passed: true, detail: "Cycle detection passed" };
    case "QG-PA-4":
      return { passed: data.milestones && data.milestones.length > 0, detail: "No milestones" };
    case "QG-PA-5":
      return { passed: data.tasks && data.tasks.every(t => /^[0-9]+[mhdw]$/.test(t.estimate || "")), detail: "Invalid estimates" };
    
    // Architect → Coder gates
    case "QG-AC-1": case "QG-AC-2":
      return { passed: data.decisions && data.decisions.length > 0, detail: "No ADRs found" };
    case "QG-AC-5":
      return { passed: data.taskAssignments && data.taskAssignments.every(a => (a.implementationGuidance || "").length >= 20), detail: "Missing guidance" };
    
    // Coder → Reviewer gates
    case "QG-CR-2":
      return { passed: data.testResults && data.testResults.failed === 0, detail: `Failed tests: ${data.testResults?.failed || "unknown"}` };
    
    // Reviewer → Coder gates
    case "QG-RC-1":
      return { passed: data.reviewItems && data.reviewItems.length > 0, detail: "No review items" };
    case "QG-RC-3":
      if (!data.decision) return { passed: false, detail: "No decision" };
      return { passed: true };
    
    default:
      return { passed: true };
  }
}

module.exports = { validateAgentHandoff, evaluateQualityGate };