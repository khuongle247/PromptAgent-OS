/**
 * phase10-scheduler-test.js
 * Verifies Phase 10: Autonomous Prompt Evolution Scheduler.
 */

const fs = require("fs");
const path = require("path");
const metricsEngine = require("../workflow/metrics-engine");
const frameworkHealth = require("../workflow/framework-health");
const scheduler = require("../workflow/prompt-evolution-scheduler");
const pvm = require("../workflow/prompt-version-manager");

const PROMPTS_DIR = path.join(process.cwd(), "prompts");
const CONFIG_PATH = path.join(process.cwd(), "config", "prompt-evolution.json");

function cleanup() {
  scheduler.stopScheduler();
  ["planner", "architect", "coder", "reviewer", "debugger"].forEach(role => {
    const dir = path.join(PROMPTS_DIR, role);
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        if (file.startsWith("v") && file.endsWith(".md") && file !== "v1.md") {
          fs.unlinkSync(path.join(dir, file));
        }
      });
      const versionsJson = path.join(dir, "versions.json");
      if (fs.existsSync(versionsJson)) {
        fs.unlinkSync(versionsJson);
      }
    }
  });

  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    config.enabled = true;
    config.intervalHours = 24;
    config.healthThreshold = 80;
    config.retryRateThreshold = 0.2;
    config.failureRateThreshold = 0.1;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createPoorMetrics() {
  const metrics = {
    totalExecutions: 10,
    successfulExecutions: 4,
    failedExecutions: 4,
    retryCount: 4,
    avgDuration: 6000
  };
  const metricsPath = path.join(process.cwd(), "metrics", "agent-performance.json");
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
}

function run() {
  cleanup();

  const config = {
    enabled: true,
    intervalHours: 0.0001,
    healthThreshold: 80,
    retryRateThreshold: 0.2,
    failureRateThreshold: 0.1,
    autoPromote: false
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  createPoorMetrics();
  frameworkHealth.generateHealthReport();

  scheduler.stopScheduler();
  scheduler.startScheduler();

  assert(scheduler.isRunning(), "Scheduler should be running after start.");

  const timeout = Date.now() + 10000;
  let ran = false;

  while (Date.now() < timeout) {
    const activePlanner = pvm.getActiveVersion("planner");
    const versions = pvm.listVersions("planner");
    if (versions.some(v => v.version > 1)) {
      ran = true;
      break;
    }
  }

  assert(ran, "Scheduler should trigger evolution and generate candidate prompts.");

  const evolved = ["planner", "architect", "coder", "reviewer"].every(role => {
    const versions = pvm.listVersions(role);
    return versions.some(v => v.version > 1);
  });

  assert(evolved, "Prompt evolution should create candidate versions for roles.");
  console.log("PASS: scheduler started and generated candidate prompts.");
}

try {
  run();
  cleanup();
  process.exit(0);
} catch (err) {
  cleanup();
  console.error("FAIL:", err.message || err);
  process.exit(1);
}
