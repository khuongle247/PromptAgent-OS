const fs = require("fs");
const path = require("path");

// =========================================
// INPUT
// =========================================

const projectName = process.argv[2];
const projectType = process.argv[3];

const ALLOWED_TYPES = [
  "flutter",
  "react",
  "nextjs",
  "spring-boot",
  "java-backend",
  "nodejs",
  "fullstack"
];

if (!projectName) {
  console.log("Usage: node scripts/init-project-v2.js ProjectName ProjectType");
  process.exit(1);
}

if (!projectType) {
  console.log("Missing ProjectType");
  process.exit(1);
}

if (!ALLOWED_TYPES.includes(projectType)) {
  console.log(`Invalid project type: ${projectType}`);

  console.log(`Allowed types: ${ALLOWED_TYPES.join(", ")}`);

  process.exit(1);
}

// =========================================
// PATHS
// =========================================

const ROOT_DIR = process.cwd();

const PROJECTS_DIR = path.join(ROOT_DIR, "projects");

const PROJECT_DIR = path.join(PROJECTS_DIR, projectName);

const TEMPLATE_COMMON = path.join(ROOT_DIR, "templates", "common");

const TEMPLATE_STACK = path.join(ROOT_DIR, "templates", projectType);

// =========================================
// VALIDATE PROJECT NAME
// =========================================

const projectRegex = /^[a-zA-Z0-9-_]+$/;

if (!projectRegex.test(projectName)) {
  console.log("Invalid project name");

  process.exit(1);
}

if (fs.existsSync(PROJECT_DIR)) {
  console.log(`Project already exists: ${projectName}`);

  process.exit(1);
}

// =========================================
// HELPERS
// =========================================

function ensureDir(dir) {
  fs.mkdirSync(dir, {
    recursive: true
  });
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  ensureDir(destination);

  const items = fs.readdirSync(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);

    const destinationPath = path.join(destination, item);

    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =========================================
// CREATE ROOT
// =========================================

ensureDir(PROJECT_DIR);

// =========================================
// CREATE FOLDERS
// =========================================

const folders = ["docs", "context", "tasks", "memory", "reports"];

folders.forEach(folder => {
  ensureDir(path.join(PROJECT_DIR, folder));
});

// =========================================
// COPY COMMON TEMPLATES
// =========================================

copyDirectory(path.join(TEMPLATE_COMMON, "docs"), path.join(PROJECT_DIR, "docs"));

copyDirectory(path.join(TEMPLATE_COMMON, "context"), path.join(PROJECT_DIR, "context"));

// =========================================
// COPY STACK TEMPLATES
// =========================================

copyDirectory(TEMPLATE_STACK, PROJECT_DIR);

// =========================================
// project.json
// =========================================

const now = new Date().toISOString();

writeJson(path.join(PROJECT_DIR, "project.json"), {
  schemaVersion: "1.0.0",

  name: projectName,
  displayName: projectName,
  type: projectType,

  version: "1.0.0",

  phase: 1,

  status: "active",

  currentRole: "planner",

  modules: [],

  milestones: [],

  commands: {
    install: "",
    build: "",
    test: "",
    lint: ""
  },

  createdAt: now,

  updatedAt: now
});

// =========================================
// validation-report.json
// =========================================

writeJson(path.join(PROJECT_DIR, "validation-report.json"), {
  status: "pending",

  score: 0,

  errors: [],

  warnings: [],

  checkedAt: null
});

// =========================================
// tasks.json
// =========================================

writeJson(path.join(PROJECT_DIR, "tasks", "tasks.json"), {
  schemaVersion: "1.0.0",

  tasks: []
});

// =========================================
// current-task.json
// =========================================

writeJson(path.join(PROJECT_DIR, "tasks", "current-task.json"), {
  taskId: null
});

// =========================================
// milestones.json
// =========================================

writeJson(path.join(PROJECT_DIR, "tasks", "milestones.json"), {
  schemaVersion: "1.0.0",

  milestones: []
});

// =========================================
// memory.json
// =========================================

writeJson(path.join(PROJECT_DIR, "memory", "memory.json"), {
  schemaVersion: "1.0.0",

  decisions: [],

  architecture: [],

  completedTasks: [],

  bugs: [],

  conventions: [],

  risks: []
});

// =========================================
// memory-summary.json
// =========================================

writeJson(path.join(PROJECT_DIR, "memory", "memory-summary.json"), {
  schemaVersion: "1.0.0",

  stats: {
    totalRecords: 0,
    decisions: 0,
    architecture: 0,
    completedTasks: 0,
    bugs: 0,
    conventions: 0,
    risks: 0
  },

  importantDecisions: [],

  importantConventions: [],

  recentTasks: [],

  knownBugs: [],

  risks: []
});

// =========================================
// REPORT FILES
// =========================================

writeJson(path.join(PROJECT_DIR, "reports", "audit-report.json"), {});

writeJson(path.join(PROJECT_DIR, "reports", "planner-report.json"), {});

writeJson(path.join(PROJECT_DIR, "reports", "coder-report.json"), {});

writeJson(path.join(PROJECT_DIR, "reports", "reviewer-report.json"), {});

// =========================================
// DONE
// =========================================

console.log(`Project created successfully`);

console.log(`Name: ${projectName}`);

console.log(`Type: ${projectType}`);

console.log(`Location: ${PROJECT_DIR}`);
