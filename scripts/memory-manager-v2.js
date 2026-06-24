const fs = require("fs");
const path = require("path");

const {
  loadMemory
} = require("./task-utils-v2");

// =====================================
// CONFIG
// =====================================

const MAX_DECISIONS = 10;
const MAX_TASKS = 10;
const MAX_BUGS = 10;
const MAX_RISKS = 10;

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/memory-manager-v2.js ProjectName"
  );

  process.exit(1);
}

// =====================================
// PATHS
// =====================================

const projectDir = path.join(
  process.cwd(),
  "projects",
  projectName
);

const summaryPath = path.join(
  projectDir,
  "memory",
  "memory-summary.json"
);

// =====================================
// HELPERS
// =====================================

function saveJson(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

function sortNewest(items) {
  return [...items].sort(
    (a, b) =>
      new Date(
        b.completedAt ||
        b.createdAt ||
        0
      ) -
      new Date(
        a.completedAt ||
        a.createdAt ||
        0
      )
  );
}

function take(items, limit) {
  return sortNewest(items)
    .slice(0, limit);
}

// =====================================
// MAIN
// =====================================

try {

  const memory =
    loadMemory(projectName);

  const summary = {
    schemaVersion:
      memory.schemaVersion ||
      "1.0.0",

    stats: {

      totalRecords:
        (memory.decisions || []).length +
        (memory.architecture || []).length +
        (memory.completedTasks || []).length +
        (memory.bugs || []).length +
        (memory.conventions || []).length +
        (memory.risks || []).length,

      decisions:
        (memory.decisions || []).length,

      architecture:
        (memory.architecture || []).length,

      completedTasks:
        (memory.completedTasks || []).length,

      bugs:
        (memory.bugs || []).length,

      conventions:
        (memory.conventions || []).length,

      risks:
        (memory.risks || []).length
    },

    importantDecisions:
      take(
        memory.decisions || [],
        MAX_DECISIONS
      ),

    importantConventions:
      take(
        memory.conventions || [],
        MAX_DECISIONS
      ),

    recentTasks:
      take(
        memory.completedTasks || [],
        MAX_TASKS
      ),

    knownBugs:
      take(
        memory.bugs || [],
        MAX_BUGS
      ),

    risks:
      take(
        memory.risks || [],
        MAX_RISKS
      ),

    generatedAt:
      new Date().toISOString()
  };

  saveJson(
    summaryPath,
    summary
  );

  console.log(
    "\nMemory summary generated successfully\n"
  );

  console.log(
    `Total Records : ${summary.stats.totalRecords}`
  );

  console.log(
    `Completed Tasks : ${summary.stats.completedTasks}`
  );

  console.log(
    `Decisions : ${summary.stats.decisions}`
  );

  console.log(
    `Bugs : ${summary.stats.bugs}`
  );

} catch (error) {

  console.log(
    error.message
  );

  process.exit(1);
}
