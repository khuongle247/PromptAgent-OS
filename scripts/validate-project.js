const fs = require("fs");
const path = require("path");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/validate-project.js ProjectName"
  );
  process.exit(1);
}

// =====================================
// PATHS
// =====================================

const ROOT_DIR = process.cwd();

const PROJECT_DIR = path.join(
  ROOT_DIR,
  "projects",
  projectName
);

if (!fs.existsSync(PROJECT_DIR)) {
  console.log(
    `Project not found: ${projectName}`
  );
  process.exit(1);
}

// =====================================
// VALIDATION STATE
// =====================================

let score = 100;

const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
  score -= 10;
}

function addWarning(message) {
  warnings.push(message);
  score -= 2;
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function loadJson(filePath) {
  try {
    const content =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// =====================================
// REQUIRED FILES
// =====================================

const REQUIRED_FILES = [
  "project.json",

  "docs/requirements.md",
  "docs/features.md",
  "docs/architecture.md",

  "context/project-context.md",
  "context/tech-stack.md",
  "context/coding-rules.md",
  "context/architecture-rules.md",
  "context/testing-rules.md",
  "context/security-rules.md",
  "context/ai-rules.md",

  "tasks/tasks.json",
  "tasks/current-task.json",

  "memory/memory.json",
  "memory/memory-summary.json"
];

// =====================================
// FILE EXISTENCE CHECK
// =====================================

console.log(
  `\nVALIDATING PROJECT: ${projectName}\n`
);

for (const file of REQUIRED_FILES) {
  const fullPath =
    path.join(
      PROJECT_DIR,
      file
    );

  if (!fileExists(fullPath)) {
    addError(
      `Missing file: ${file}`
    );
  } else {
    console.log(`✓ ${file}`);
  }
}

// =====================================
// PROJECT.JSON
// =====================================

const projectPath =
  path.join(
    PROJECT_DIR,
    "project.json"
  );

const project =
  loadJson(projectPath);

if (!project) {
  addError(
    "Invalid JSON: project.json"
  );
} else {
  const requiredFields = [
    "name",
    "type",
    "phase",
    "status",
    "currentRole"
  ];

  requiredFields.forEach(field => {
    if (
      project[field] === undefined ||
      project[field] === null
    ) {
      addError(
        `project.json missing field: ${field}`
      );
    }
  });
}

// =====================================
// TASKS.JSON
// =====================================

const tasksPath =
  path.join(
    PROJECT_DIR,
    "tasks",
    "tasks.json"
  );

const tasksData =
  loadJson(tasksPath);

if (!tasksData) {
  addError(
    "Invalid JSON: tasks.json"
  );
} else {
  if (
    !Array.isArray(
      tasksData.tasks
    )
  ) {
    addError(
      "tasks.json must contain tasks array"
    );
  } else {
    const ids = new Set();

    for (const task of tasksData.tasks) {
      if (!task.id) {
        addError(
          "Task missing id"
        );
        continue;
      }

      if (ids.has(task.id)) {
        addError(
          `Duplicate task ID: ${task.id}`
        );
      }

      ids.add(task.id);

      const requiredTaskFields = [
        "title",
        "status",
        "priority"
      ];

      requiredTaskFields.forEach(field => {
        if (
          task[field] === undefined
        ) {
          addWarning(
            `Task ${task.id} missing field: ${field}`
          );
        }
      });
    }

    if (
      tasksData.tasks.length === 0
    ) {
      addWarning(
        "No tasks found"
      );
    }
  }
}

// =====================================
// CURRENT TASK
// =====================================

const currentTaskPath =
  path.join(
    PROJECT_DIR,
    "tasks",
    "current-task.json"
  );

const currentTask =
  loadJson(
    currentTaskPath
  );

if (!currentTask) {
  addError(
    "Invalid JSON: current-task.json"
  );
} else {
  if (
    currentTask.taskId
  ) {
    const exists =
      tasksData?.tasks?.some(
        task =>
          task.id ===
          currentTask.taskId
      );

    if (!exists) {
      addError(
        `Current task not found: ${currentTask.taskId}`
      );
    }
  } else {
    addWarning(
      "No current task selected"
    );
  }
}

// =====================================
// MEMORY
// =====================================

const memoryPath =
  path.join(
    PROJECT_DIR,
    "memory",
    "memory.json"
  );

const memorySummaryPath =
  path.join(
    PROJECT_DIR,
    "memory",
    "memory-summary.json"
  );

const memory =
  loadJson(memoryPath);

const memorySummary =
  loadJson(
    memorySummaryPath
  );

if (!memory) {
  addError(
    "Invalid JSON: memory.json"
  );
}

if (!memorySummary) {
  addError(
    "Invalid JSON: memory-summary.json"
  );
}

// =====================================
// SCORE LIMIT
// =====================================

if (score < 0) {
  score = 0;
}

// =====================================
// STATUS
// =====================================

let status = "ok";

if (errors.length > 0) {
  status = "error";
} else if (
  warnings.length > 0
) {
  status = "warning";
}

// =====================================
// REPORT
// =====================================

const report = {
  status,
  score,
  errors,
  warnings,
  checkedAt:
    new Date().toISOString()
};

fs.writeFileSync(
  path.join(
    PROJECT_DIR,
    "validation-report.json"
  ),
  JSON.stringify(
    report,
    null,
    2
  )
);

// =====================================
// OUTPUT
// =====================================

console.log("\n");

console.log(
  `Status   : ${status.toUpperCase()}`
);

console.log(
  `Score    : ${score}`
);

console.log(
  `Errors   : ${errors.length}`
);

console.log(
  `Warnings : ${warnings.length}`
);

if (errors.length) {
  console.log("\nERRORS:");

  errors.forEach(error => {
    console.log(
      `- ${error}`
    );
  });
}

if (warnings.length) {
  console.log(
    "\nWARNINGS:"
  );

  warnings.forEach(warning => {
    console.log(
      `- ${warning}`
    );
  });
}

console.log(
  "\nValidation report updated.\n"
);