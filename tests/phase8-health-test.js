/**
 * phase8-health-test.js
 * Verifies Framework Health Engine (Phase 8).
 * Does not modify any existing files or business logic.
 */

const fh = require("../workflow/framework-health");
const fs = require("fs");
const path = require("path");

// Ensure we have metrics data from Phase 7 test artifacts
const METRICS_DIR = path.join(process.cwd(), "metrics");
const LOGS_DIR = path.join(process.cwd(), "logs");
const HEALTH_DIR = path.join(process.cwd(), "health");

function ensureTestData() {
  // Create metrics dir if missing
  if (!fs.existsSync(METRICS_DIR)) fs.mkdirSync(METRICS_DIR, { recursive: true });

  // Write test agent metrics (healthy scenario)
  fs.writeFileSync(path.join(METRICS_DIR, "agent-performance.json"), JSON.stringify({
    totalExecutions: 20,
    successfulExecutions: 20,
    failedExecutions: 0,
    retryCount: 1,
    avgDuration: 2000,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  // Write test task metrics
  fs.writeFileSync(path.join(METRICS_DIR, "task-metrics.json"), JSON.stringify({
    totalTasks: 5,
    completedTasks: 4,
    failedTasks: 1,
    avgCycleTime: 120000,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  // Write test learning metrics
  fs.writeFileSync(path.join(METRICS_DIR, "learning-metrics.json"), JSON.stringify({
    lessonsLearned: 3,
    reusablePatterns: 2,
    memoryUpdates: 4,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  // Write test audit log with some events
  const auditEntries = [
    { id: "AUD-001", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: true }, correlationId: "task-TASK-001" },
    { id: "AUD-002", eventType: "agent-transitioned", timestamp: new Date().toISOString(), actor: "planner", payload: { action: "advance" }, correlationId: "task-TASK-001" },
    { id: "AUD-003", eventType: "healing-cycle-completed", timestamp: new Date().toISOString(), actor: "self-healing-engine", payload: { passed: true }, correlationId: "task-TASK-002" },
    { id: "AUD-004", eventType: "bug-pattern-recorded", timestamp: new Date().toISOString(), actor: "self-healing-engine", payload: { bugId: "BUG-001" }, correlationId: "BUG-001" },
    { id: "AUD-005", eventType: "lesson-learned", timestamp: new Date().toISOString(), actor: "learning-loop-engine", payload: { lessonId: "LESSON-001" }, correlationId: "LESSON-001" }
  ];
  fs.writeFileSync(path.join(LOGS_DIR, "audit.jsonl"), auditEntries.map(e => JSON.stringify(e)).join("\n"));
}

function clearHealthDir() {
  if (fs.existsSync(HEALTH_DIR)) {
    const files = fs.readdirSync(HEALTH_DIR);
    files.forEach(f => fs.unlinkSync(path.join(HEALTH_DIR, f)));
    fs.rmdirSync(HEALTH_DIR);
  }
}

async function runAll() {
  console.log("=== PHASE 8 FRAMEWORK HEALTH TEST ===\n");

  ensureTestData();
  clearHealthDir();

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

  // ---- Test 1: Bottleneck Detectors ----
  console.log("\n--- Test 1: Bottleneck Detectors ---");

  // Retry rate below threshold (3/20 = 15%)
  const lowRetryMetrics = { totalExecutions: 20, successfulExecutions: 18, failedExecutions: 2, retryCount: 3, avgDuration: 2500 };
  assert(fh.detectRetryRateBottleneck(lowRetryMetrics) === null, "Retry rate 15% is below threshold (no bottleneck)");

  // Retry rate above threshold (6/20 = 30%)
  const highRetryMetrics = { totalExecutions: 20, successfulExecutions: 14, failedExecutions: 6, retryCount: 6, avgDuration: 2500 };
  const retryBottleneck = fh.detectRetryRateBottleneck(highRetryMetrics);
  assert(retryBottleneck !== null, "Retry rate 30% triggers bottleneck");
  assert(retryBottleneck.type === "high-retry-rate", "Bottleneck type is high-retry-rate");

  // Duration below threshold
  assert(fh.detectHighDurationBottleneck(lowRetryMetrics) === null, "Duration 2500ms is below threshold (no bottleneck)");

  // Duration above threshold
  const highDurationMetrics = { totalExecutions: 10, successfulExecutions: 8, failedExecutions: 2, retryCount: 1, avgDuration: 15000 };
  const durationBottleneck = fh.detectHighDurationBottleneck(highDurationMetrics);
  assert(durationBottleneck !== null, "Duration 15000ms triggers bottleneck");
  assert(durationBottleneck.type === "high-avg-duration", "Bottleneck type is high-avg-duration");

  // Healing cycle detection
  const auditWithHealing = [
    { eventType: "healing-cycle-completed", timestamp: new Date().toISOString() },
    { eventType: "healing-cycle-completed", timestamp: new Date().toISOString() },
    { eventType: "healing-cycle-completed", timestamp: new Date().toISOString() },
    { eventType: "healing-cycle-completed", timestamp: new Date().toISOString() }
  ];
  const healingBottleneck = fh.detectHealingCycleBottleneck(auditWithHealing);
  assert(healingBottleneck !== null, "4 healing cycles in last hour triggers bottleneck");
  assert(healingBottleneck.type === "excessive-healing-cycles", "Bottleneck type is excessive-healing-cycles");

  // ---- Test 2: Risk Detectors ----
  console.log("\n--- Test 2: Risk Detectors ---");

  // Failure rate below threshold (2/20 = 10%)
  assert(fh.detectFailureRateRisk(lowRetryMetrics) === null, "Failure rate 10% is below threshold (no risk)");

  // Failure rate above threshold (6/20 = 30%)
  const highFailureMetrics = { totalExecutions: 20, successfulExecutions: 14, failedExecutions: 6, retryCount: 4, avgDuration: 2500 };
  const failureRisk = fh.detectFailureRateRisk(highFailureMetrics);
  assert(failureRisk !== null, "Failure rate 30% triggers risk");
  assert(failureRisk.type === "high-failure-rate", "Risk type is high-failure-rate");

  // Bug pattern detection
  const auditWithBugs = [
    { eventType: "bug-pattern-recorded", timestamp: new Date().toISOString() },
    { eventType: "bug-pattern-recorded", timestamp: new Date().toISOString() },
    { eventType: "bug-pattern-recorded", timestamp: new Date().toISOString() }
  ];
  const bugRisk = fh.detectRecurringBugPatterns(auditWithBugs);
  assert(bugRisk !== null, "3 bug patterns triggers risk");
  assert(bugRisk.type === "recurring-bug-patterns", "Risk type is recurring-bug-patterns");

  // Memory conflict detection
  const highChurnLearning = { lessonsLearned: 2, reusablePatterns: 1, memoryUpdates: 6 };
  const memoryRisk = fh.detectMemoryConflicts(highChurnLearning);
  assert(memoryRisk !== null, "Memory updates 6x with 2 lessons triggers risk");
  assert(memoryRisk.type === "memory-conflict-churn", "Risk type is memory-conflict-churn");

  // Prompt degradation detection
  const highRetryForPrompt = { totalExecutions: 10, successfulExecutions: 6, failedExecutions: 4, retryCount: 4, avgDuration: 2500 };
  const promptRisk = fh.detectPromptDegradation(highRetryForPrompt);
  assert(promptRisk !== null, "Retry rate 40% triggers prompt degradation risk");
  assert(promptRisk.type === "prompt-degradation", "Risk type is prompt-degradation");

  // Task failure rate detection
  const highTaskFailure = { totalTasks: 5, completedTasks: 3, failedTasks: 2, avgCycleTime: 120000 };
  const taskFailureRisk = fh.detectTaskFailureRateRisk(highTaskFailure);
  assert(taskFailureRisk !== null, "Task failure rate 40% triggers risk");
  assert(taskFailureRisk.type === "high-task-failure-rate", "Risk type is high-task-failure-rate");

  // ---- Test 3: Health Score Calculation ----
  console.log("\n--- Test 3: Health Score Calculation ---");

  // Perfect scenario
  const perfectScore = fh.calculateHealthScore(
    { totalExecutions: 10, successfulExecutions: 10, failedExecutions: 0, retryCount: 0, avgDuration: 1000 },
    { totalTasks: 5, completedTasks: 5, failedTasks: 0, avgCycleTime: 60000 },
    { lessonsLearned: 5, reusablePatterns: 3, memoryUpdates: 2 },
    [], []
  );
  assert(perfectScore === 100, `Perfect score is 100 (got ${perfectScore})`);

  // Degraded scenario
  const degradedScore = fh.calculateHealthScore(
    { totalExecutions: 20, successfulExecutions: 12, failedExecutions: 8, retryCount: 6, avgDuration: 12000 },
    { totalTasks: 10, completedTasks: 5, failedTasks: 4, avgCycleTime: 300000 },
    { lessonsLearned: 1, reusablePatterns: 0, memoryUpdates: 0 },
    [{ type: "high-retry-rate", severity: "warning" }],
    [{ type: "high-failure-rate", severity: "warning" }]
  );
  assert(degradedScore < 80, `Degraded score is < 80 (got ${degradedScore})`);
  assert(degradedScore >= 0, `Degraded score is >= 0 (got ${degradedScore})`);

  // Status determination
  assert(fh.determineStatus(100) === "healthy", "Score 100 = healthy");
  assert(fh.determineStatus(80) === "healthy", "Score 80 = healthy");
  assert(fh.determineStatus(60) === "degraded", "Score 60 = degraded");
  assert(fh.determineStatus(40) === "degraded", "Score 40 = degraded");
  assert(fh.determineStatus(39) === "critical", "Score 39 = critical");
  assert(fh.determineStatus(0) === "critical", "Score 0 = critical");

  // ---- Test 4: Recommendation Engine ----
  console.log("\n--- Test 4: Recommendation Engine ---");

  const recsForRetry = fh.generateRecommendations(
    [{ type: "high-retry-rate", severity: "warning", detail: "test", value: 0.3, threshold: 0.2 }],
    [],
    { totalExecutions: 10, successfulExecutions: 7, failedExecutions: 3, retryCount: 3, avgDuration: 2000 },
    { lessonsLearned: 2, reusablePatterns: 1, memoryUpdates: 1 }
  );
  assert(recsForRetry.length > 0, "Recommendations generated for retry bottleneck");
  assert(recsForRetry.some(r => r.id === "REC-OPTIMIZE-PROMPT"), "REC-OPTIMIZE-PROMPT recommended");
  assert(recsForRetry.some(r => r.id === "REC-ADD-VALIDATION"), "REC-ADD-VALIDATION recommended");

  const recsForBugs = fh.generateRecommendations(
    [],
    [{ type: "recurring-bug-patterns", severity: "warning", detail: "test", value: 3, threshold: 3 }],
    { totalExecutions: 10, successfulExecutions: 8, failedExecutions: 2, retryCount: 1, avgDuration: 2000 },
    { lessonsLearned: 2, reusablePatterns: 1, memoryUpdates: 1 }
  );
  assert(recsForBugs.some(r => r.id === "REC-ADD-BUG-TESTS"), "REC-ADD-BUG-TESTS recommended for bug patterns");

  const recsForMemory = fh.generateRecommendations(
    [],
    [{ type: "memory-conflict-churn", severity: "warning", detail: "test", value: 3, threshold: 2 }],
    { totalExecutions: 10, successfulExecutions: 8, failedExecutions: 2, retryCount: 1, avgDuration: 2000 },
    { lessonsLearned: 2, reusablePatterns: 1, memoryUpdates: 1 }
  );
  assert(recsForMemory.some(r => r.id === "REC-INCREASE-MEMORY-THRESHOLD"), "REC-INCREASE-MEMORY-THRESHOLD recommended");

  const recsForNoIssues = fh.generateRecommendations([], [], { totalExecutions: 10, successfulExecutions: 10, failedExecutions: 0, retryCount: 0, avgDuration: 1000 }, { lessonsLearned: 3, reusablePatterns: 2, memoryUpdates: 1 });
  assert(recsForNoIssues.some(r => r.id === "REC-NO-ISSUES"), "REC-NO-ISSUES recommended when no issues");

  // ---- Test 5: Full Health Report Generation ----
  console.log("\n--- Test 5: Full Health Report Generation ---");

  const report = fh.generateHealthReport();

  assert(report.score !== undefined, "Report has score");
  assert(report.status !== undefined, "Report has status");
  assert(report.generatedAt !== undefined, "Report has generatedAt");
  assert(report.summary !== undefined, "Report has summary");
  assert(Array.isArray(report.bottlenecks), "Report has bottlenecks array");
  assert(Array.isArray(report.risks), "Report has risks array");
  assert(Array.isArray(report.recommendations), "Report has recommendations array");

  // With our test data (healthy scenario), score should be high
  assert(report.score >= 80, `Health score >= 80 for healthy test data (got ${report.score})`);
  assert(report.status === "healthy", `Status is healthy (got ${report.status})`);

  // Verify persistence
  const persistedPath = path.join(HEALTH_DIR, "framework-status.json");
  assert(fs.existsSync(persistedPath), "framework-status.json was persisted");

  const persisted = JSON.parse(fs.readFileSync(persistedPath, "utf8"));
  assert(persisted.score === report.score, "Persisted report matches generated report");

  // Verify getHealthReport
  const loaded = fh.getHealthReport();
  assert(loaded !== null, "getHealthReport() returns data");
  assert(loaded.score === report.score, "getHealthReport() matches generated report");

  // ---- Test 6: Edge Cases ----
  console.log("\n--- Test 6: Edge Cases ---");

  // No metrics files
  fs.unlinkSync(path.join(METRICS_DIR, "agent-performance.json"));
  fs.unlinkSync(path.join(METRICS_DIR, "task-metrics.json"));
  fs.unlinkSync(path.join(METRICS_DIR, "learning-metrics.json"));

  const emptyReport = fh.generateHealthReport();
  assert(emptyReport.score >= 0, "Empty metrics produce valid score");
  assert(emptyReport.summary.totalExecutions === 0, "Empty metrics show 0 executions");
  assert(emptyReport.bottlenecks.length === 0, "Empty metrics produce no bottlenecks");
  assert(emptyReport.risks.length === 0, "Empty metrics produce no risks");

  // Restore test data
  ensureTestData();

  // ---- Summary ----
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error("Test crashed:", err);
  process.exit(1);
});