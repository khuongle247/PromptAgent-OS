/**
 * phase95-automation-test.js
 * Verifies Phase 9.5 automation layer for prompt evolution execution.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "run-prompt-evolution.js");
const PROMPTS_DIR = path.join(process.cwd(), "prompts");

function cleanup() {
  ["planner", "architect", "coder", "reviewer", "debugger"].forEach(role => {
    const dir = path.join(PROMPTS_DIR, role);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
      if (file.startsWith("v") && file.endsWith(".md") && file !== "v1.md") {
        fs.unlinkSync(path.join(dir, file));
      }
    });
    const versionsJson = path.join(dir, "versions.json");
    if (fs.existsSync(versionsJson)) {
      fs.unlinkSync(versionsJson);
    }
  });
}

function run() {
  cleanup();

  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: path.join(process.cwd()),
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);

  const promptCandidateExists = ["planner", "architect", "coder", "reviewer", "debugger"].some(role => {
    const dir = path.join(PROMPTS_DIR, role);
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir).some(file => file.startsWith("v") && file.endsWith(".md") && file !== "v1.md");
  });

  if (result.status !== 0) {
    throw new Error(`run-prompt-evolution.js exited with code ${result.status}`);
  }

  if (!promptCandidateExists) {
    throw new Error("No prompt candidate files were generated after running the automation script.");
  }

  console.log("PASS: automation script runs and generates prompt candidates.");
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error("FAIL:", err.message || err);
  process.exit(1);
}
