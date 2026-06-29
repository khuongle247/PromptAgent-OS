const fs = require("fs");
const path = require("path");

const projectName = process.argv[2];

if (!projectName) {
  console.log("Usage: node memory-manager.js ProjectName");
  process.exit(1);
}

const memoryPath = path.join(projectName, "docs", "memory.md");

const summaryPath = path.join(projectName, "docs", "memory-summary.md");

if (!fs.existsSync(memoryPath)) {
  console.log("memory.md not found");
  process.exit(1);
}

const memory = fs.readFileSync(memoryPath, "utf8");

const lines = memory.split("\n").filter(Boolean);

const recent = lines.slice(-50);

const summary = `
# MEMORY SUMMARY

Last 50 Records

${recent.join("\n")}
`;

fs.writeFileSync(summaryPath, summary, "utf8");

console.log("Memory summary generated");
