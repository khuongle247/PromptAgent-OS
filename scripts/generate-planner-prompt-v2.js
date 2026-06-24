const fs = require("fs");
const path = require("path");

const {
  readJson
} = require("./validation/validation-utils");

const {
  loadTasks
} = require("./task-engine-v3");

const {
  validateDependencies
} = require("./task-engine-v3");

// =====================================

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/generate-planner-prompt-v2.js ProjectName"
  );
  process.exit(1);
}

// =====================================

const ROOT = process.cwd();

const projectDir = path.join(
  ROOT,
  "projects",
  projectName
);

// =====================================
// LOAD DATA
// =====================================

const project = readJson(
  path.join(projectDir, "project.json")
);

const requirements = fs.existsSync(
  path.join(projectDir, "docs/requirements.md")
)
  ? fs.readFileSync(
      path.join(projectDir, "docs/requirements.md"),
      "utf8"
    )
  : "";

const features = fs.existsSync(
  path.join(projectDir, "docs/features.md")
)
  ? fs.readFileSync(
      path.join(projectDir, "docs/features.md"),
      "utf8"
    )
  : "";

const milestones = fs.existsSync(
  path.join(projectDir, "tasks/milestones.json")
)
  ? readJson(
      path.join(projectDir, "tasks/milestones.json")
    )
  : { milestones: [] };

const tasks = loadTasks(projectDir);

const memory = readJson(
  path.join(projectDir, "memory/memory-summary.json")
);

// =====================================
// BUILD TASK GRAPH
// =====================================

const taskGraph = tasks.map((t) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  dependencies: t.dependencies || []
}));

const dependencyErrors = validateDependencies(tasks);

// =====================================
// FIND READY TASKS
// =====================================

const readyTasks = tasks.filter((t) => {
  const deps = t.dependencies || [];
  return (
    t.status === "todo" &&
    deps.every((d) =>
      tasks.find((x) => x.id === d && x.status === "done")
    )
  );
});

// =====================================
// FINAL PROMPT (STRICT JSON ONLY)
// =====================================

const output = {
  project: {
    name: project.name,
    type: project.type,
    phase: project.phase
  },

  requirements,
  features,

  milestones: milestones.milestones,

  taskGraph,

  readyTasks,

  memorySummary: memory,

  validation: {
    dependencyErrors
  },

  outputRules: {
    strict: true,
    format: "JSON ONLY",
    mustFollowSchema:
      "schemas/planner-output.schema.json",
    forbidden: [
      "markdown",
      "explanations",
      "comments"
    ]
  },

  instruction:
    "Generate ONLY valid planner-output.json following schema. No extra text."
};

// =====================================
// SAVE PROMPT
// =====================================

const outputPath = path.join(
  projectDir,
  "planner-prompt.json"
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(output, null, 2)
);

console.log("\nPlanner prompt generated");
console.log("Output:", outputPath);