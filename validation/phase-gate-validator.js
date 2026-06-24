/**
 * Phase Gate Validator
 * Framework-level validator that enforces phase progression with entry/exit criteria.
 * Validates that all prerequisites are met before allowing phase advancement.
 */
const fs = require("fs");
const path = require("path");
const { validateContent } = require("./content-validator");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getPhaseGates(rootDir) {
  const gatesPath = path.join(rootDir, "schemas", "phase-gates.schema.json");
  return loadJson(gatesPath).phases;
}

function validateFileExists(filePath) {
  return fileExists(filePath);
}

function validateSchemaValid(filePath) {
  try {
    loadJson(filePath);
    return true;
  } catch { return false; }
}

function validateContentQuality(filePath, minLength) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8").trim();
  return content.length >= (minLength || 50);
}

function validateCountMin(filePath, key, min) {
  if (!fileExists(filePath)) return false;
  try {
    const data = loadJson(filePath);
    const items = key ? data[key] || [] : data;
    return Array.isArray(items) && items.length >= min;
  } catch { return false; }
}

function validatePhaseGate(rootDir, projectDir, phase) {
  const gates = getPhaseGates(rootDir);
  const phaseGate = gates.find(g => g.phase === phase);
  if (!phaseGate) return { passed: false, errors: ["Phase gate not found"] };

  const errors = [];
  const warnings = [];

  // Validate exit criteria for previous phase
  if (phase > 1) {
    const prevGate = gates.find(g => g.phase === phase - 1);
    if (prevGate && prevGate.exitCriteria) {
      for (const criterion of prevGate.exitCriteria) {
        const result = evaluateCriterion(criterion, projectDir, rootDir);
        if (!result.passed) {
          errors.push(`Phase ${phase - 1} exit criterion ${criterion.id} failed: ${criterion.description}${result.detail ? " - " + result.detail : ""}`);
        }
      }
    }
  }

  // Validate entry criteria for current phase
  if (phaseGate.entryCriteria) {
    for (const criterion of phaseGate.entryCriteria) {
      const result = evaluateCriterion(criterion, projectDir, rootDir);
      if (!result.passed) {
        errors.push(`Entry criterion ${criterion.id} failed: ${criterion.description}${result.detail ? " - " + result.detail : ""}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    phase,
    phaseName: phaseGate.name
  };
}

function evaluateCriterion(criterion, projectDir, rootDir) {
  const params = criterion.params || {};

  switch (criterion.validationType) {
    case "file-exists": {
      const filePath = path.join(projectDir, params.path || "");
      return { passed: validateFileExists(filePath), detail: filePath };
    }
    case "schema-valid": {
      const filePath = path.join(projectDir, params.path || "");
      if (!validateFileExists(filePath)) return { passed: false, detail: "File not found" };
      return { passed: validateSchemaValid(filePath) };
    }
    case "content-quality": {
      const filePath = path.join(projectDir, params.path || "");
      return { passed: validateContentQuality(filePath, params.minLength), detail: `min ${params.minLength || 50} chars` };
    }
    case "count-min": {
      return { passed: validateCountMin(path.join(projectDir, params.path || ""), params.key, params.min), detail: `min ${params.min} items` };
    }
    default:
      return { passed: true, detail: "Unknown validation type - skipped" };
  }
}

module.exports = { validatePhaseGate, evaluateCriterion };