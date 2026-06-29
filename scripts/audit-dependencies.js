/**
 * Comprehensive dependency audit for 11 target files
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const filesToAudit = [
  "scripts/append-memory.js",
  "scripts/generate-prompt.js",
  "scripts/generate-prompt-v3.js",
  "scripts/init-project.js",
  "scripts/task-utils-v2.js",
  "scripts/validate-project.js",
  "scripts/validation/dependency-validator.js",
  "scripts/validation/memory-validator.js",
  "scripts/validation/project-validator.js",
  "scripts/validation/summary-validator.js",
  "scripts/validation/task-validator.js"
];

const audit = [];

for (const f of filesToAudit) {
  const basename = path.basename(f);
  const nameOnly = basename.replace(".js", "");

  let importedBy = [];
  let requiredBy = [];
  let alternatives = [];
  let testCoverage = false;

  // Find all references (imports)
  try {
    const cmd = `git grep -l "${basename}"`;
    const result = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    if (result) {
      importedBy = result
        .split("\n")
        .filter(x => x && !x.includes(f))
        .slice(0, 20);
    }
  } catch (e) {}

  // Find direct requires
  try {
    const cmd = `git grep -l "require.*${nameOnly}"`;
    const result = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
    if (result) {
      requiredBy = result
        .split("\n")
        .filter(x => x && x !== f)
        .slice(0, 20);
    }
  } catch (e) {}

  // Check for newer versions
  const dir = path.dirname(f);
  if (fs.existsSync(dir)) {
    try {
      const siblings = fs.readdirSync(dir);
      const pattern = nameOnly.replace(/-v\d+$/, "");
      alternatives = siblings.filter(
        s => s.startsWith(pattern) && s !== basename && s.endsWith(".js")
      );
    } catch (e) {}
  }

  // Check test coverage
  try {
    const cmd = `git grep -l "${basename}" -- tests/`;
    execSync(cmd, { stdio: "pipe" });
    testCoverage = true;
  } catch (e) {}

  // Determine status
  let status = "UNUSED";
  if (testCoverage) status = "TEST-ONLY";
  if (requiredBy.length > 0) status = "ACTIVE";
  if (alternatives.length > 0 && requiredBy.length === 0) status = "LEGACY";

  audit.push({
    file: f,
    status,
    importedBy,
    requiredBy,
    alternatives,
    testCoverage,
    productionUse: requiredBy.length > 0,
    recommendation:
      status === "ACTIVE"
        ? "KEEP - Production use detected"
        : status === "LEGACY"
          ? "REVIEW - Newer version exists; check if can migrate or remove"
          : status === "TEST-ONLY"
            ? "REVIEW - Test-only usage; consider consolidation"
            : "CONSIDER REMOVING - No external references found"
  });
}

console.log(JSON.stringify({ generated: new Date().toISOString(), files: audit }, null, 2));
