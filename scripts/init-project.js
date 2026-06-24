const fs = require("fs");
const path = require("path");

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/init-project.js ProjectName"
  );
  process.exit(1);
}

const folders = [
  `${projectName}/docs`,
  `${projectName}/prompts`,
  `${projectName}/context`,
  `${projectName}/src`
];

folders.forEach(folder => {
  fs.mkdirSync(folder, {
    recursive: true
  });
});

const files = [
  // Docs
  `${projectName}/docs/requirements.md`,
  `${projectName}/docs/features.md`,
  `${projectName}/docs/architecture.md`,
  `${projectName}/docs/tasks.md`,
  `${projectName}/docs/decisions.md`,
  `${projectName}/docs/changelog.md`,
  `${projectName}/docs/memory.md`,
  `${projectName}/docs/memory-summary.md`,

  // Context
  `${projectName}/context/tech-stack.md`,
  `${projectName}/context/coding-rules.md`,
  `${projectName}/context/architecture-rules.md`,
  `${projectName}/context/ai-rules.md`,

  // Prompts
  `${projectName}/prompts/planner.md`,
  `${projectName}/prompts/architect.md`,
  `${projectName}/prompts/coder.md`,
  `${projectName}/prompts/reviewer.md`,
  `${projectName}/prompts/debugger.md`,
  `${projectName}/prompts/memory-manager.md`
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "");
  }
});

console.log(
  `Project '${projectName}' created successfully`
);