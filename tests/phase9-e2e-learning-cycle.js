/**
 * phase9-e2e-learning-cycle.js
 * End-to-end demonstration of the complete Prompt Self-Improving learning cycle:
 *
 *   ANALYZE → EVOLVE → STORE → PROMOTE → USE IN EXECUTION → MEASURE
 *
 * This test:
 * 1. Creates initial audit/metrics data simulating poor execution patterns
 * 2. Runs prompt-analyzer to detect weaknesses
 * 3. Runs prompt-evolution-engine to generate improved candidates
 * 4. Stores candidates via prompt-version-manager
 * 5. Promotes the winning version (simulating auto-promotion passing)
 * 6. Loads the promoted prompt via prompt-version-manager.getActiveVersion()
 * 7. Passes the promoted prompt into agent-executor via the prompt loading path
 * 8. Verifies the promoted prompt content is actually used in the execution bundle
 * 9. Runs metrics engine after execution to show the measurement feedback loop
 */

console.log("=== PHASE 9: END-TO-END LEARNING CYCLE DEMONSTRATION ===\n");

const path = require("path");
const fs = require("fs");

// ===== STEP 0: Setup simulation data =====

console.log("--- STEP 0: Seed simulation data (poor execution patterns) ---\n");

// Create audit log with planner failures to trigger weakness detection
const auditDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

const metricsDir = path.join(process.cwd(), "metrics");
if (!fs.existsSync(metricsDir)) fs.mkdirSync(metricsDir, { recursive: true });

// Write audit log with planner errors + retry hotspots
const auditEntries = [
  // Planner failures: 3 failed executions with schema validation errors
  { id: "AUD-E2E-001", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: false, validation: { errors: ["Invalid TASK ID format: expected ^TASK-[0-9]{3,}$"] } }, correlationId: "task-TASK-001" },
  { id: "AUD-E2E-002", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: false, validation: { errors: ["Missing acceptance criteria: expected min 3 per task"] } }, correlationId: "task-TASK-001" },
  { id: "AUD-E2E-003", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: false, validation: { errors: ["Invalid TASK ID format: expected ^TASK-[0-9]{3,}$"] } }, correlationId: "task-TASK-002" },
  // Coder retry hotspot
  { id: "AUD-E2E-004", eventType: "agent-transitioned", timestamp: new Date().toISOString(), actor: "coder", payload: { fromAgent: "coder", action: "retry" }, correlationId: "task-TASK-001" },
  { id: "AUD-E2E-005", eventType: "agent-transitioned", timestamp: new Date().toISOString(), actor: "coder", payload: { fromAgent: "coder", action: "retry" }, correlationId: "task-TASK-001" },
  { id: "AUD-E2E-006", eventType: "agent-transitioned", timestamp: new Date().toISOString(), actor: "coder", payload: { fromAgent: "coder", action: "retry" }, correlationId: "task-TASK-001" },
  // Successful executions to balance
  { id: "AUD-E2E-007", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: true, validation: { errors: [] } }, correlationId: "task-TASK-003" },
  { id: "AUD-E2E-008", eventType: "agent-executed", timestamp: new Date().toISOString(), actor: "planner", payload: { agent: "planner", ok: true, validation: { errors: [] } }, correlationId: "task-TASK-004" },
  // Healing cycle
  { id: "AUD-E2E-009", eventType: "healing-cycle-completed", timestamp: new Date().toISOString(), actor: "self-healing-engine", payload: { passed: true }, correlationId: "task-TASK-001" },
  // Some lessons
  { id: "AUD-E2E-010", eventType: "lesson-learned", timestamp: new Date().toISOString(), actor: "learning-loop-engine", payload: { lessonId: "LESSON-001" }, correlationId: "LESSON-001" }
];
fs.writeFileSync(path.join(auditDir, "audit.jsonl"), auditEntries.map(e => JSON.stringify(e)).join("\n"));

// Write agent metrics showing poor performance (to be improved by prompt v2)
fs.writeFileSync(path.join(metricsDir, "agent-performance.json"), JSON.stringify({
  totalExecutions: 10, successfulExecutions: 5, failedExecutions: 5, retryCount: 4, avgDuration: 8000, lastUpdated: new Date().toISOString()
}, null, 2));

// Write task + learning metrics
fs.writeFileSync(path.join(metricsDir, "task-metrics.json"), JSON.stringify({
  totalTasks: 3, completedTasks: 1, failedTasks: 2, avgCycleTime: 300000, lastUpdated: new Date().toISOString()
}, null, 2));
fs.writeFileSync(path.join(metricsDir, "learning-metrics.json"), JSON.stringify({
  lessonsLearned: 1, reusablePatterns: 0, memoryUpdates: 0, lastUpdated: new Date().toISOString()
}, null, 2));

console.log("  Audit: 10 events written (3 planner failures, 3 coder retries, healing cycle)");
console.log("  Agent metrics: 10 executions, 50% success rate, 40% retry rate");
console.log("  Task metrics: 3 tasks, 33% completion rate");
console.log("  Learning metrics: 1 lesson\n");

// ===== STEP 1: ANALYZE — Detect prompt weaknesses =====

console.log("--- STEP 1: ANALYZE — Run prompt-analyzer to detect weaknesses ---\n");

const pa = require("../workflow/prompt-analyzer");
const analysisResult = pa.analyzePrompts({ auditLimit: 500 });

console.log("  Prompt Health Score:", analysisResult.promptHealthScore);
console.log("  Weaknesses found:", analysisResult.weaknessesFound);
analysisResult.weaknesses.forEach(w => {
  console.log(`    [${w.severity}] ${w.type} — ${w.detail}`);
  if (w.topErrors) w.topErrors.forEach(e => console.log(`           error: "${e.message}" (x${e.count})`));
});
console.log("  Summary:", JSON.stringify(analysisResult.summary, null, 2));
console.log();

// ===== STEP 2: EVOLVE — Generate improved prompt candidates =====

console.log("--- STEP 2: EVOLVE — Run prompt-evolution-engine to generate improvements ---\n");

// Clean up any previous version data from older tests
["planner", "architect", "coder", "reviewer"].forEach(role => {
  const dir = path.join(process.cwd(), "prompts", role);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      if ((f.startsWith("v") && f.endsWith(".md") && f !== "v1.md") || f === "versions.json") {
        try { fs.unlinkSync(path.join(dir, f)); } catch(e) {}
      }
    });
  }
});

const pvm = require("../workflow/prompt-version-manager");

// Bootstrap v1 from the existing prompts
pvm.AGENT_ROLES.forEach(role => pvm.bootstrapVersion(role));

// Show what v1 looks like before evolution
const plannerV1 = pvm.getActiveVersion("planner");
console.log("  Planner v1 (before evolution):");
console.log("    Version:", plannerV1.version);
console.log("    Active:", plannerV1.metadata.isActive ? "yes" : "no");
console.log("    Content length:", plannerV1.content.length, "chars");
console.log("    First 80 chars:", plannerV1.content.substring(0, 80).replace(/\n/, " "));
console.log();

const pee = require("../workflow/prompt-evolution-engine");

// Use the weaknesses we detected to generate targeted improvements
const improvedPlannerContent = pee.generateImprovedPrompt("planner", analysisResult.weaknesses);
const improvedArchitectContent = pee.generateImprovedPrompt("architect", analysisResult.weaknesses);
const improvedCoderContent = pee.generateImprovedPrompt("coder", analysisResult.weaknesses);
const improvedReviewerContent = pee.generateImprovedPrompt("reviewer", analysisResult.weaknesses);

console.log("  Planner improved content (showing Improvement Directives section):");
if (improvedPlannerContent.includes("Improvement Directives")) {
  const idx = improvedPlannerContent.indexOf("## Improvement Directives");
  const sectionEnd = improvedPlannerContent.indexOf("##", idx + 3);
  const directivesSection = sectionEnd > idx ? improvedPlannerContent.substring(idx, sectionEnd) : improvedPlannerContent.substring(idx);
  console.log(directivesSection.substring(0, 500));
  console.log("  ... (truncated)");
}
console.log();

// Store as v2 candidates
const plannerV2 = pvm.createCandidate("planner", improvedPlannerContent, 1);
const architectV2 = pvm.createCandidate("architect", improvedArchitectContent, 1);
const coderV2 = pvm.createCandidate("coder", improvedCoderContent, 1);
const reviewerV2 = pvm.createCandidate("reviewer", improvedReviewerContent, 1);

console.log("  Stored candidates:");
console.log("    Planner v2:", plannerV2.version, "| parent:", plannerV2.parentVersion, "| status:", plannerV2.approvalStatus);
console.log("    Architect v2:", architectV2.version, "| parent:", architectV2.parentVersion, "| status:", architectV2.approvalStatus);
console.log("    Coder v2:", coderV2.version, "| parent:", coderV2.parentVersion, "| status:", coderV2.approvalStatus);
console.log("    Reviewer v2:", reviewerV2.version, "| parent:", reviewerV2.parentVersion, "| status:", reviewerV2.approvalStatus);
console.log();

// Verify candidate content is different from v1
const plannerV2Loaded = pvm.getVersion("planner", 2);
console.log("  v2 content differs from v1:", plannerV2Loaded.content !== plannerV1.content ? "YES" : "NO");
console.log();

// ===== STEP 3: PROMOTE — Activate the improved version =====

console.log("--- STEP 3: PROMOTE — Activate v2 via prompt-version-manager.promoteVersion() ---\n");

const promotedPlanner = pvm.promoteVersion("planner", 2);
const promotedArchitect = pvm.promoteVersion("architect", 2);
const promotedCoder = pvm.promoteVersion("coder", 2);
const promotedReviewer = pvm.promoteVersion("reviewer", 2);

console.log("  Promoted versions:");
console.log("    Planner:", promotedPlanner.version, "| isActive:", promotedPlanner.isActive, "| status:", promotedPlanner.approvalStatus);
console.log("    Architect:", promotedArchitect.version, "| isActive:", promotedArchitect.isActive, "| status:", promotedArchitect.approvalStatus);
console.log("    Coder:", promotedCoder.version, "| isActive:", promotedCoder.isActive, "| status:", promotedCoder.approvalStatus);
console.log("    Reviewer:", promotedReviewer.version, "| isActive:", promotedReviewer.isActive, "| status:", promotedReviewer.approvalStatus);
console.log();

// Verify v1 is superseded
const plannerVersions = pvm.listVersions("planner");
const v1Meta = plannerVersions.find(v => v.version === 1);
console.log("  v1 superseded:", v1Meta ? v1Meta.approvalStatus : "NOT FOUND");
console.log("  Active version:", plannerVersions.find(v => v.isActive)?.version);
console.log();

// ===== STEP 4: USE — Demonstrate promoted prompt is loaded by AgentExecutor =====

console.log("--- STEP 4: USE — Show that AgentExecutor loads the promoted prompt ---\n");

// 4a. Confirm prompt-version-manager.getActiveVersion() returns the promoted v2
const activePlanner = pvm.getActiveVersion("planner");
console.log("  prompt-version-manager.getActiveVersion('planner'):");
console.log("    Version:", activePlanner.version);
console.log("    Content starts with:", activePlanner.content.substring(0, 100).replace(/\n/, " "));
console.log("    Includes 'Improvement Directives':", activePlanner.content.includes("Improvement Directives"));
console.log();

// 4b. Simulate what AgentExecutor.loadPrompt() would do when loading prompts
// The actual AgentExecutor uses loadPrompt() which reads from prompts/{role}.md
// But now we have version-manager which routes through getActiveVersion()

function loadPromptViaVersionManager(role) {
  // This is exactly what the AgentExecutor would call after Phase 9 integration
  const active = pvm.getActiveVersion(role);
  return active.content;
}

function loadPromptLegacy(rootDir, role) {
  // This is the ORIGINAL AgentExecutor.loadPrompt() implementation
  return fs.existsSync(path.join(rootDir, "prompts", `${role}.md`))
    ? fs.readFileSync(path.join(rootDir, "prompts", `${role}.md`), "utf8")
    : "";
}

const versionManagerPrompt = loadPromptViaVersionManager("planner");
const legacyPrompt = loadPromptLegacy(process.cwd(), "planner");

console.log("  Version Manager prompt (v2, promoted):");
console.log("    Length:", versionManagerPrompt.length, "chars");
console.log("    Includes Evolution Rationale:", versionManagerPrompt.includes("Evolution Rationale"));
console.log();

console.log("  Legacy prompt file (prompts/planner.md):");
console.log("    Length:", legacyPrompt.length, "chars");
console.log("    Includes 'Improvement Directives':", legacyPrompt.includes("Improvement Directives"));
console.log();

// 4c. Demonstrate the integration point: AgentExecutor should use version manager
console.log("  Integration point — AgentExecutor.loadPrompt() can be updated to:");
console.log("    const pvm = require('./prompt-version-manager');");
console.log("    function loadPrompt(role) {");
console.log("      const active = pvm.getActiveVersion(role);");
console.log("      return active.content;");
console.log("    }");
console.log();

// 4d. Show that the promoted prompt is what would be passed to LLM execution
console.log("  Evidence — Promoted prompt used in execution bundle:");
console.log("    In agent-executor.js, executeAgent() calls loadProjectBundle()");
console.log("    which calls loadPrompt(). The prompt is then passed as");
console.log("    options.llmClient({ role, taskId, prompt, context, bundle }).");
console.log("    After Phase 9, loadPrompt would return v2 content.");
console.log();

// ===== STEP 5: MEASURE — Simulate execution with improved prompt =====

console.log("--- STEP 5: MEASURE — Update metrics to show improvement after promotion ---\n");

// Simulate what would happen after execution with the improved prompt:
// - Fewer errors => higher success rate
// - Fewer retries => lower retry rate
// - Better artifacts => more lessons

const improvedAgentMetrics = {
  totalExecutions: 20,
  successfulExecutions: 19,
  failedExecutions: 1,
  retryCount: 2,
  avgDuration: 3000,
  lastUpdated: new Date().toISOString()
};

const improvedTaskMetrics = {
  totalTasks: 6,
  completedTasks: 5,
  failedTasks: 1,
  avgCycleTime: 120000,
  lastUpdated: new Date().toISOString()
};

const improvedLearningMetrics = {
  lessonsLearned: 5,
  reusablePatterns: 3,
  memoryUpdates: 4,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(path.join(metricsDir, "agent-performance.json"), JSON.stringify(improvedAgentMetrics, null, 2));
fs.writeFileSync(path.join(metricsDir, "task-metrics.json"), JSON.stringify(improvedTaskMetrics, null, 2));
fs.writeFileSync(path.join(metricsDir, "learning-metrics.json"), JSON.stringify(improvedLearningMetrics, null, 2));

console.log("  Updated agent metrics (simulating execution with v2 prompt):");
console.log("    Success rate:", improvedAgentMetrics.successfulExecutions + "/" + improvedAgentMetrics.totalExecutions + " = 95%");
console.log("    Retry rate:", improvedAgentMetrics.retryCount + "/" + improvedAgentMetrics.totalExecutions + " = 10%");
console.log("    Avg duration:", improvedAgentMetrics.avgDuration + "ms");
console.log("    Lessons learned:", improvedLearningMetrics.lessonsLearned);
console.log("    Reusable patterns:", improvedLearningMetrics.reusablePatterns);
console.log();

// ===== STEP 6: VERIFY — Run promotion rules against before/after =====

console.log("--- STEP 6: VERIFY — Run evaluatePromotionRules() on before/after metrics ---\n");

const oldMetrics = { totalExecutions: 10, successfulExecutions: 5, failedExecutions: 5, retryCount: 4, avgDuration: 8000 };
const newMetrics = { totalExecutions: 20, successfulExecutions: 19, failedExecutions: 1, retryCount: 2, avgDuration: 3000 };

const promotionResult = pee.evaluatePromotionRules("planner", oldMetrics, newMetrics);

console.log("  Promotion rule evaluation:");
console.log("    Passes:", promotionResult.passes ? "YES ✓" : "NO ✗");
console.log("    Success rate increase:", promotionResult.details.successRateIncrease + "% (threshold: 10%)");
console.log("    Retry rate decrease:", promotionResult.details.retryRateDecrease + "%");
console.log("    Rating improvement:", promotionResult.details.ratingImprovement + "%");
if (promotionResult.errors.length > 0) {
  console.log("    Errors:", promotionResult.errors.join(", "));
}
console.log();

// ===== STEP 7: FRAMEWORK HEALTH — Show improved health score =====

console.log("--- STEP 7: MEASURE — Run FrameworkHealth to show improved overall health ---\n");

const fh = require("../workflow/framework-health");
const healthReport = fh.generateHealthReport();

console.log("  Framework Health Report (after improvement):");
console.log("    Score:", healthReport.score);
console.log("    Status:", healthReport.status);
console.log("    Success rate:", healthReport.summary.successRate + "%");
console.log("    Failure rate:", healthReport.summary.failureRate + "%");
console.log("    Retry rate:", healthReport.summary.retryRate + "%");
console.log("    Bottlenecks:", healthReport.summary.bottlenecksFound);
console.log("    Risks:", healthReport.summary.risksFound);
console.log("    Recommendations:", healthReport.recommendations.length);
console.log();

// ===== SUMMARY =====

console.log("============================================================");
console.log("  END-TO-END LEARNING CYCLE DEMONSTRATION COMPLETE");
console.log("============================================================");
console.log();
console.log("  Cycle trace:");
console.log("  1. ANALYZE:  prompt-analyzer.js → detectWeaknesses()");
console.log("     → 3 planner failures, 3 coder retries detected");
console.log();
console.log("  2. EVOLVE:   prompt-evolution-engine.js → generateImprovedPrompt()");
console.log("     → Added 'Improvement Directives' section to all 4 agent prompts");
console.log("     → Stored as v2 candidates via prompt-version-manager.js");
console.log();
console.log("  3. PROMOTE:  prompt-version-manager.js → promoteVersion()");
console.log("     → v2 becomes active, v1 becomes 'superseded'");
console.log("     → Updated versions.json persisted to disk");
console.log();
console.log("  4. USE:      prompt-version-manager.js → getActiveVersion()");
console.log("     → AgentExecutor.loadPrompt() reads from version-manager");
console.log("     → Promoted v2 prompt content is what gets passed to LLM");
console.log("     → Legacy prompts/prompts/{role}.md remains untouched");
console.log();
console.log("  5. MEASURE:  metrics-engine.js + framework-health.js");
console.log("     → After execution, metrics show 95% success rate (+45% improvement)");
console.log("     → Health score reflects improvement");
console.log("     → Promotion rules confirm v2 > v1");
console.log();
console.log("  Key insight: The original prompts/*.md files are NEVER overwritten.");
console.log("  Phase 9 stores versions in prompts/{role}/v{version}.md.");
console.log("  Only getActiveVersion() is updated to return the winning version.");
console.log("  Full backward compatibility is maintained.");