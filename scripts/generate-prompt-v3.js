const fs = require("fs");
const path = require("path");

const { loadProject, getCurrentTask, loadTasks } = require("./task-utils-v2");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];

const role = process.argv[3] || "coder";

if (!projectName) {
  console.log("Usage: node scripts/generate-prompt-v3.js ProjectName [planner|coder|reviewer]");

  process.exit(1);
}

// =====================================
// PATHS
// =====================================

const projectDir = path.join(process.cwd(), "projects", projectName);

function readFile(relativePath) {
  const filePath = path.join(projectDir, relativePath);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function readJson(relativePath) {
  const filePath = path.join(projectDir, relativePath);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// =====================================
// VALIDATION
// =====================================

const validation = readJson("validation-report.json");

if (validation.status === "error") {
  console.log("\nProject validation failed.");

  console.log("Fix validation errors first.");

  process.exit(1);
}

// =====================================
// PROJECT
// =====================================

const project = loadProject(projectName);

const currentTask = getCurrentTask(projectName);

const allTasks = loadTasks(projectName);

// =====================================
// DOCS
// =====================================

const requirements = readFile("docs/requirements.md");

const features = readFile("docs/features.md");

const architecture = readFile("docs/architecture.md");

const api = readFile("docs/api.md");

const dataModel = readFile("docs/data-model.md");

// =====================================
// CONTEXT
// =====================================

const projectContext = readFile("context/project-context.md");

const techStack = readFile("context/tech-stack.md");

const codingRules = readFile("context/coding-rules.md");

const architectureRules = readFile("context/architecture-rules.md");

const testingRules = readFile("context/testing-rules.md");

const securityRules = readFile("context/security-rules.md");

const aiRules = readFile("context/ai-rules.md");

// =====================================
// MEMORY
// =====================================

const memorySummary = readJson("memory/memory-summary.json");

// =====================================
// ROLE PROMPT
// =====================================

const rolePromptPath = path.join(process.cwd(), "prompts", `${role}.md`);

let rolePrompt = "";

if (fs.existsSync(rolePromptPath)) {
  rolePrompt = fs.readFileSync(rolePromptPath, "utf8");
}

// =====================================
// TASK SUMMARY
// =====================================

const todoTasks = (allTasks.tasks || []).filter(t => t.status === "todo").length;

const doneTasks = (allTasks.tasks || []).filter(t => t.status === "done").length;

// =====================================
// BUILD PROMPT
// =====================================

const prompt = `
# PROJECT INFORMATION

Project Name:
${project.name}

Project Type:
${project.type}

Current Phase:
${project.phase}

Role:
${role}

---

# VALIDATION STATUS

Status:
${validation.status}

Score:
${validation.score}

Warnings:
${(validation.warnings || []).join("\n")}

---

# CURRENT TASK

${currentTask ? JSON.stringify(currentTask, null, 2) : "No task selected"}

---

# TASK SUMMARY

Total Tasks:
${(allTasks.tasks || []).length}

Todo:
${todoTasks}

Done:
${doneTasks}

---

# REQUIREMENTS

${requirements}

---

# FEATURES

${features}

---

# ARCHITECTURE

${architecture}

---

# API

${api}

---

# DATA MODEL

${dataModel}

---

# PROJECT CONTEXT

${projectContext}

---

# TECH STACK

${techStack}

---

# CODING RULES

${codingRules}

---

# ARCHITECTURE RULES

${architectureRules}

---

# TESTING RULES

${testingRules}

---

# SECURITY RULES

${securityRules}

---

# AI RULES

${aiRules}

---

# MEMORY SUMMARY

${JSON.stringify(memorySummary, null, 2)}

---

# ROLE INSTRUCTIONS

${rolePrompt}

---

# OUTPUT REQUIREMENTS

1. Follow project architecture.

2. Follow coding rules.

3. Follow acceptance criteria.

4. Do not modify unrelated modules.

5. Explain important decisions.

6. Return production-ready output.
`;

// =====================================
// SAVE
// =====================================

const outputFile = path.join(projectDir, "prompt-output.md");

fs.writeFileSync(outputFile, prompt);

// =====================================
// DONE
// =====================================

console.log("\nPrompt generated successfully\n");

console.log(`Role : ${role}`);

console.log(`Output : ${outputFile}`);
