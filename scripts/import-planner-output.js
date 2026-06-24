const path = require("path");

const {
  readJson,
  writeJson,
  createReport,
  finalizeReport
} = require("./validation/validation-utils");

const {
  validatePlannerOutput
} = require("./validation/validate-planner-output");

const projectName =
  process.argv[2];

if (!projectName) {

  console.log(
    "Usage: node scripts/import-planner-output.js ProjectName"
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

// =====================================
// VALIDATE PLANNER OUTPUT
// =====================================

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

if (report.errors.length) {
  console.log(
    "\nPlanner output invalid\n"
  );

  report.errors.forEach(
    error =>
      console.log(
        `- ${error}`
      )
  );

  process.exit(1);
}

// =====================================
// LOAD FILES
// =====================================

const plannerOutput =
  readJson(
    path.join(
      projectDir,
      "planner-output.json"
    )
  );

const tasksFile =
  readJson(
    path.join(
      projectDir,
      "tasks",
      "tasks.json"
    )
  );

// =====================================
// TASK ID GENERATOR
// =====================================

function getMaxTaskNumber(
  tasks
) {
  let max = 0;

  tasks.forEach(
    task => {

      const match =
        task.id.match(
          /TASK-(\d+)/
        );

      if (!match) return;

      max =
        Math.max(
          max,
          Number(
            match[1]
          )
        );
    }
  );

  return max;
}

function formatTaskId(number) {
  return (
    "TASK-" +
    String(number)
      .padStart(3, "0")
  );
}

// =====================================
// DUPLICATE CHECK
// =====================================

const existingTasks =
  tasksFile.tasks || [];

const existingTitles =
  new Set(
    existingTasks.map(
      t =>
        t.title
          .trim()
          .toLowerCase()
    )
  );

const existingTitleToId =
  new Map(
    existingTasks.map(task => [
      task.title
        .trim()
        .toLowerCase(),
      task.id
    ])
  );

// =====================================
// IMPORT
// =====================================

let imported = 0;
let nextTaskNumber =
  getMaxTaskNumber(
    existingTasks
  ) + 1;

const idMap =
  new Map();

plannerOutput.tasks.forEach(plannerTask => {
  const title =
    plannerTask.title
      .trim()
      .toLowerCase();

  if (existingTitleToId.has(title)) {
    idMap.set(
      plannerTask.id,
      existingTitleToId.get(title)
    );

    return;
  }

  idMap.set(
    plannerTask.id,
    formatTaskId(
      nextTaskNumber
    )
  );

  nextTaskNumber++;
});

plannerOutput.tasks.forEach(
  plannerTask => {

    const title =
      plannerTask.title
        .trim()
        .toLowerCase();

    if (
      existingTitles.has(
        title
      )
    ) {

      console.log(
        `Skip duplicate: ${plannerTask.title}`
      );

      return;
    }

    const newTask = {

      id:
        idMap.get(
          plannerTask.id
        ),

      title:
        plannerTask.title,

      module:
        plannerTask.module ||
        "general",

      status:
        "todo",

      priority:
        plannerTask.priority,

      dependencies:
        (plannerTask.dependencies || [])
          .map(depId =>
            idMap.get(depId) ||
            depId
          ),

      acceptanceCriteria:
        plannerTask.acceptanceCriteria ||
        [],

      definitionOfDone:
        plannerTask.definitionOfDone ||
        [],

      source:
        "planner",

      createdAt:
        new Date()
          .toISOString(),

      updatedAt:
        new Date()
          .toISOString()
    };

    existingTasks.push(
      newTask
    );

    existingTitles.add(
      title
    );

    imported++;
  }
);

// =====================================
// SAVE
// =====================================

tasksFile.tasks =
  existingTasks;

writeJson(
  path.join(
    projectDir,
    "tasks",
    "tasks.json"
  ),
  tasksFile
);

console.log(
  `\nImported ${imported} tasks`
);
