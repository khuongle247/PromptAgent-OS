const fs = require("fs");
const path = require("path");

const { readJson, addError, addWarning } = require("./validation-utils");

function validateSummary(projectDir, report) {
  const memoryFile = path.join(projectDir, "memory", "memory.json");

  const summaryFile = path.join(projectDir, "memory", "memory-summary.json");

  const memory = readJson(memoryFile);

  const summary = readJson(summaryFile);

  // =====================
  // STRUCTURE
  // =====================

  if (!summary.stats) {
    addError(report, "memory-summary.json missing stats");
  }

  if (!summary.recentTasks) {
    addWarning(report, "memory-summary.json missing recentTasks");
  }

  if (!summary.importantDecisions) {
    addWarning(report, "memory-summary.json missing importantDecisions");
  }

  // =====================
  // FRESHNESS
  // =====================

  const memoryTime = fs.statSync(memoryFile).mtimeMs;

  const summaryTime = fs.statSync(summaryFile).mtimeMs;

  if (summaryTime < memoryTime) {
    addWarning(report, "memory-summary.json is outdated");
  }

  // =====================
  // EMPTY CHECK
  // =====================

  const totalMemoryRecords =
    (memory.decisions || []).length +
    (memory.architecture || []).length +
    (memory.completedTasks || []).length +
    (memory.bugs || []).length +
    (memory.conventions || []).length +
    (memory.risks || []).length;

  if (totalMemoryRecords > 0 && Object.keys(summary).length <= 1) {
    addWarning(report, "Summary appears empty while memory has records");
  }
}

module.exports = {
  validateSummary
};
