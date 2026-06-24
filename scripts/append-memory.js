const fs = require("fs");
const path = require("path");

const projectName = process.argv[2];

const message = process.argv
  .slice(3)
  .join(" ");

if (!projectName || !message) {
  console.log(
    "Usage: node append-memory.js ProjectName Message"
  );
  process.exit(1);
}

const memoryPath = path.join(
  projectName,
  "docs",
  "memory.md"
);

const now = new Date()
  .toISOString();

const entry =
  `\n[${now}] ${message}\n`;

fs.appendFileSync(
  memoryPath,
  entry
);

console.log(
  "Memory updated"
);