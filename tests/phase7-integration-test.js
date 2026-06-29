/**
 * phase7-integration-test.js
 * Verifies AuditEngine + MetricsEngine initialization and event capture.
 * Does not modify any existing files or business logic.
 */

const EventBus = require("../workflow/event-bus");
const AuditEngine = require("../workflow/audit-engine");
const MetricsEngine = require("../workflow/metrics-engine");
const { initializeEngines, reset: resetIntegration } = require("../scripts/event-integration");
const fs = require("fs");
const path = require("path");

const AUDIT_LOG = path.join(process.cwd(), "logs", "audit.jsonl");
const AGENT_METRICS = path.join(process.cwd(), "metrics", "agent-performance.json");
const TASK_METRICS = path.join(process.cwd(), "metrics", "task-metrics.json");
const LEARNING_METRICS = path.join(process.cwd(), "metrics", "learning-metrics.json");

function clearArtifacts() {
  [AUDIT_LOG, AGENT_METRICS, TASK_METRICS, LEARNING_METRICS].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

async function runAll() {
  console.log("=== PHASE 7 INTEGRATION TEST ===\n");

  // Clean slate
  clearArtifacts();
  EventBus.reset();

  let passed = 0;
  let failed = 0;

  function assert(condition, label) {
    if (condition) {
      console.log(`  PASS: ${label}`);
      passed++;
    } else {
      console.log(`  FAIL: ${label}`);
      failed++;
    }
  }

  // ---- Test 1: Initialize Engines ----
  console.log("\n--- Test 1: Engine Initialization ---");
  const bus = EventBus;

  // Should initialize without error
  try {
    initializeEngines(bus);
    assert(true, "initializeEngines() completed without error");
  } catch (e) {
    assert(false, `initializeEngines() threw: ${e.message}`);
  }

  // Calling again should be idempotent
  try {
    initializeEngines(bus);
    assert(true, "initializeEngines() is idempotent (second call ok)");
  } catch (e) {
    assert(false, `initializeEngines() second call threw: ${e.message}`);
  }

  // ---- Test 2: AuditEngine captures wildcard events ----
  console.log("\n--- Test 2: AuditEngine wildcard capture ---");
  await bus.publish("test-event-a", { msg: "audit check" });
  await bus.publish("agent-executed", {
    agent: "planner",
    taskId: "TASK-001",
    ok: true,
    duration: 50,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    output: {},
    validation: { valid: true, errors: [] },
    context: {}
  });
  await bus.publish("artifact-written", {
    agent: "planner",
    taskId: "TASK-001",
    artifactPath: "test",
    schemaPath: "test",
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });

  const auditLog = fs.existsSync(AUDIT_LOG)
    ? fs.readFileSync(AUDIT_LOG, "utf8").trim().split("\n").filter(Boolean)
    : [];
  assert(auditLog.length >= 3, `Audit log has ${auditLog.length} entries (expected >= 3)`);

  // Verify record structure
  if (auditLog.length > 0) {
    const record = JSON.parse(auditLog[0]);
    assert(record.id && record.id.startsWith("AUD-"), "Audit record has id field");
    assert(record.eventType !== undefined, "Audit record has eventType field");
    assert(record.timestamp !== undefined, "Audit record has timestamp field");
    assert(record.actor !== undefined, "Audit record has actor field");
    assert(record.payload !== undefined, "Audit record has payload field");
  }

  // Check getAuditLog API
  const filterResult = AuditEngine.getAuditLog({ eventType: "agent-executed" });
  assert(filterResult.length >= 1, "getAuditLog filter by eventType works");
  assert(
    filterResult.every(r => r.eventType === "agent-executed"),
    "getAuditLog filter returns only matching events"
  );

  // Check limit
  const limited = AuditEngine.getAuditLog({}, 1);
  assert(limited.length <= 1, "getAuditLog limit works");

  // ---- Test 3: MetricsEngine captures agent metrics ----
  console.log("\n--- Test 3: MetricsEngine agent metrics ---");
  const agentMetrics = MetricsEngine.getAgentMetrics();
  assert(
    agentMetrics.totalExecutions >= 1,
    `totalExecutions >= 1 (got ${agentMetrics.totalExecutions})`
  );
  assert(
    agentMetrics.successfulExecutions >= 1,
    `successfulExecutions >= 1 (got ${agentMetrics.successfulExecutions})`
  );
  assert(
    agentMetrics.failedExecutions >= 0,
    `failedExecutions >= 0 (got ${agentMetrics.failedExecutions})`
  );

  // Check persisted file
  const agentFile = fs.existsSync(AGENT_METRICS)
    ? JSON.parse(fs.readFileSync(AGENT_METRICS, "utf8"))
    : null;
  assert(agentFile !== null, "agent-performance.json exists");
  assert(
    agentFile.totalExecutions === agentMetrics.totalExecutions,
    "Persisted agent metrics match in-memory"
  );

  // ---- Test 4: MetricsEngine captures learning metrics ----
  console.log("\n--- Test 4: MetricsEngine learning metrics ---");
  await bus.publish("lesson-learned", {
    lessonId: "LESSON-001",
    type: "success-pattern",
    description: "Test lesson captured successfully.",
    references: ["TASK-001"],
    details: { taskTitle: "test" },
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });
  await bus.publish("memory-importance-updated", {
    memoryId: "MEM-001",
    oldImportance: 2,
    newImportance: 3,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });
  await bus.publish("reusable-pattern-identified", {
    patternId: "P-001",
    description: "Test pattern",
    count: 2,
    exampleReferences: [],
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });

  const learningMetrics = MetricsEngine.getLearningMetrics();
  assert(
    learningMetrics.lessonsLearned >= 1,
    `lessonsLearned >= 1 (got ${learningMetrics.lessonsLearned})`
  );
  assert(
    learningMetrics.memoryUpdates >= 1,
    `memoryUpdates >= 1 (got ${learningMetrics.memoryUpdates})`
  );
  assert(
    learningMetrics.reusablePatterns >= 1,
    `reusablePatterns >= 1 (got ${learningMetrics.reusablePatterns})`
  );

  // Check persisted file
  const learningFile = fs.existsSync(LEARNING_METRICS)
    ? JSON.parse(fs.readFileSync(LEARNING_METRICS, "utf8"))
    : null;
  assert(learningFile !== null, "learning-metrics.json exists");

  // ---- Test 5: MetricsEngine captures healing cycle metrics ----
  console.log("\n--- Test 5: MetricsEngine healing/task metrics ---");
  await bus.publish("healing-cycle-completed", {
    taskId: "TASK-002",
    passed: true,
    reason: "Fixed",
    attemptsMade: 1,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });

  const taskMetrics = MetricsEngine.getTaskMetrics();
  assert(taskMetrics.totalTasks >= 1, `totalTasks >= 1 (got ${taskMetrics.totalTasks})`);
  assert(
    taskMetrics.completedTasks >= 1,
    `completedTasks >= 1 (got ${taskMetrics.completedTasks})`
  );

  // Check persisted file
  const taskFile = fs.existsSync(TASK_METRICS)
    ? JSON.parse(fs.readFileSync(TASK_METRICS, "utf8"))
    : null;
  assert(taskFile !== null, "task-metrics.json exists");

  // ---- Test 6: getAllMetrics returns complete snapshot ----
  console.log("\n--- Test 6: getAllMetrics snapshot ---");
  const all = MetricsEngine.getAllMetrics();
  assert(all.agent !== undefined, "getAllMetrics contains agent metrics");
  assert(all.task !== undefined, "getAllMetrics contains task metrics");
  assert(all.learning !== undefined, "getAllMetrics contains learning metrics");
  assert(all.lastUpdated !== undefined, "getAllMetrics contains lastUpdated timestamp");

  // ---- Test 7: Existing event validation still works ----
  console.log("\n--- Test 7: Non-regression — invalid event still quarantined ---");
  const beforeInvalidEvent = fs.existsSync(path.join(process.cwd(), "logs", "invalid-events.jsonl"))
    ? fs.readFileSync(path.join(process.cwd(), "logs", "invalid-events.jsonl"), "utf8")
    : "";
  await bus.publish("agent-executed", {
    agent: "planner",
    taskId: "BAD-ID",
    ok: true,
    output: {},
    validation: { valid: true, errors: [] },
    duration: 10,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    context: {}
  });
  const afterInvalidEvent = fs.readFileSync(
    path.join(process.cwd(), "logs", "invalid-events.jsonl"),
    "utf8"
  );
  assert(
    afterInvalidEvent.length > beforeInvalidEvent.length,
    "Invalid event was quarantined (log grew)"
  );

  // ---- Summary ----
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error("Test crashed:", err);
  process.exit(1);
});
