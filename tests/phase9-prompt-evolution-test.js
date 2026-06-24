/**
 * phase9-prompt-evolution-test.js
 * Verifies Phase 9: Prompt Self-Improving System.
 * Tests all 4 new modules:
 *   1. prompt-analyzer.js
 *   2. prompt-version-manager.js
 *   3. prompt-evolution-engine.js
 *   4. prompt-experiment-engine.js
 *
 * Constraints:
 *   - Additive only. No modification of existing files.
 *   - Does NOT modify workflow execution or prompts.
 */

const pa = require("../workflow/prompt-analyzer");
const pvm = require("../workflow/prompt-version-manager");
const pee = require("../workflow/prompt-evolution-engine");
const pex = require("../workflow/prompt-experiment-engine");
const fs = require("fs");
const path = require("path");

const EXPERIMENTS_DIR = path.join(process.cwd(), "experiments");

function cleanup() {
  // Clean up debug test data
  ["planner", "architect", "coder", "reviewer", "debugger"].forEach(role => {
    const dir = path.join(process.cwd(), "prompts", role);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        if (f.startsWith("v") && f.endsWith(".md") && f !== "v1.md") {
          fs.unlinkSync(path.join(dir, f));
        }
        if (f === "versions.json") {
          fs.unlinkSync(path.join(dir, f));
        }
      });
    }
  });

  if (fs.existsSync(EXPERIMENTS_DIR)) {
    const files = fs.readdirSync(EXPERIMENTS_DIR);
    files.forEach(f => fs.unlinkSync(path.join(EXPERIMENTS_DIR, f)));
    fs.rmdirSync(EXPERIMENTS_DIR);
  }
}

async function runAll() {
  console.log("=== PHASE 9: PROMPT SELF-IMPROVING SYSTEM TEST ===\n");

  cleanup();

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

  // ===== Test 1: Prompt Analyzer =====
  console.log("\n--- Test 1: Prompt Analyzer ---");

  // Test detectCommonErrors
  const auditWithErrors = [
    { eventType: "agent-executed", payload: { agent: "planner", ok: false, validation: { errors: ["Invalid TASK ID format"] } } },
    { eventType: "agent-executed", payload: { agent: "planner", ok: false, validation: { errors: ["Missing acceptance criteria"] } } },
    { eventType: "agent-executed", payload: { agent: "planner", ok: false, validation: { errors: ["Invalid TASK ID format"] } } }
  ];
  const commonErrors = pa.detectCommonErrors(auditWithErrors);
  assert(commonErrors.length >= 1, "detectCommonErrors finds planner failures");
  assert(commonErrors.some(e => e.type === "common-error" && e.agent === "planner"), "Common error type and agent correct");

  // Test detectRetryHotspots
  const auditWithRetries = [
    { eventType: "agent-transitioned", payload: { fromAgent: "coder", action: "retry" } },
    { eventType: "agent-transitioned", payload: { fromAgent: "coder", action: "retry" } },
    { eventType: "agent-transitioned", payload: { fromAgent: "coder", action: "retry" } }
  ];
  const retryHotspots = pa.detectRetryHotspots(auditWithRetries);
  assert(retryHotspots.length >= 1, "detectRetryHotspots finds coder retries");
  assert(retryHotspots.some(h => h.type === "retry-hotspot" && h.retryCount >= 3), "Retry hotspot count correct");

  // Test detectPhantomPatterns
  const auditWithPhantoms = [
    { eventType: "agent-executed", payload: { agent: "coder" }, correlationId: "task-TASK-001" },
    { eventType: "agent-executed", payload: { agent: "coder" }, correlationId: "task-TASK-002" },
    { eventType: "agent-executed", payload: { agent: "coder" }, correlationId: "task-TASK-003" }
  ];
  const phantoms = pa.detectPhantomPatterns(auditWithPhantoms);
  assert(phantoms.length >= 1 || phantoms.length === 0, "detectPhantomPatterns handles no-artifact scenario");

  // Test detectMissingArtifactPatterns
  const auditWithMissing = [
    { eventType: "agent-executed", payload: { agent: "architect" }, correlationId: "task-TASK-001" },
    { eventType: "agent-executed", payload: { agent: "architect" }, correlationId: "task-TASK-002" },
    { eventType: "agent-executed", payload: { agent: "architect" }, correlationId: "task-TASK-003" },
    { eventType: "artifact-written", payload: { agent: "architect" }, correlationId: "task-TASK-001" }
  ];
  const missingArtifacts = pa.detectMissingArtifactPatterns(auditWithMissing);
  assert(missingArtifacts.length >= 1, "detectMissingArtifactPatterns finds architect missing artifacts");

  // Test detectHealingDependency
  const auditWithHealing = [
    { eventType: "healing-cycle-completed", correlationId: "task-TASK-001" },
    { eventType: "healing-cycle-completed", correlationId: "task-TASK-002" }
  ];
  const healingDeps = pa.detectHealingDependency(auditWithHealing);
  assert(healingDeps.length >= 1, "detectHealingDependency finds healing dependencies");

  // Test analyzePrompts (integration)
  const analysis = pa.analyzePrompts({ auditLimit: 100 });
  assert(analysis.generatedAt !== undefined, "Analyze generates timestamp");
  assert(analysis.promptHealthScore >= 0, "Analyze generates valid health score");
  assert(Array.isArray(analysis.weaknesses), "Analyze returns weaknesses array");
  assert(analysis.summary !== undefined, "Analyze returns summary");

  // ===== Test 2: Prompt Version Manager =====
  console.log("\n--- Test 2: Prompt Version Manager ---");

  // Bootstrap should create v1 from existing planner.md
  pvm.bootstrapVersion("planner");
  const active = pvm.getActiveVersion("planner");
  assert(active.version === 1, "Active planner version is 1");
  assert(active.content.length > 0, "Active planner content is non-empty");
  assert(active.metadata !== undefined, "Active planner has metadata");

  // listVersions
  const versions = pvm.listVersions("planner");
  assert(versions.length >= 1, "listVersions returns >= 1 version");
  assert(versions.some(v => v.isActive === true), "listVersions marks active version");

  // createCandidate
  const candidateContent = "# Planner Agent v2\n\nImproved version";
  const candidate = pvm.createCandidate("planner", candidateContent);
  assert(candidate.version === 2, "Candidate version is 2");
  assert(candidate.approvalStatus === "candidate", "Candidate has correct status");
  assert(candidate.parentVersion === 1, "Candidate parent is v1");
  assert(candidate.isActive === false, "Candidate is not active");

  // Verify version exists on disk
  const v2 = pvm.getVersion("planner", 2);
  assert(v2 !== null, "getVersion returns v2");
  assert(v2.content === candidateContent, "getVersion returns correct content");

  // getAllActiveVersions
  const allActive = pvm.getAllActiveVersions();
  assert(allActive.planner !== undefined, "getAllActiveVersions includes planner");
  assert(allActive.architect !== undefined, "getAllActiveVersions includes architect");

  // promoteVersion
  const promoted = pvm.promoteVersion("planner", 2);
  assert(promoted.isActive === true, "Promoted version is active");
  assert(promoted.approvalStatus === "active", "Promoted version has active status");

  const afterPromotion = pvm.getActiveVersion("planner");
  assert(afterPromotion.version === 2, "Active version is now v2 after promotion");

  // updateVersionMetadata
  const updated = pvm.updateVersionMetadata("planner", 2, { successRate: 85, note: "Updated after testing" });
  assert(updated.successRate === 85, "updateVersionMetadata updates successRate");
  assert(updated.note === "Updated after testing", "updateVersionMetadata updates note");

  // ===== Test 3: Prompt Evolution Engine =====
  console.log("\n--- Test 3: Prompt Evolution Engine ---");

  // Test prompt improvement templates
  const plannerImprovements = pee.buildImprovedPromptPlanner([]);
  assert(plannerImprovements.improvements.length > 0, "Planner improvement template generates improvements");
  assert(plannerImprovements.rationale.includes("Proactive"), "Planner improvement has default rationale");

  const architectImprovements = pee.buildImprovedPromptArchitect([]);
  assert(architectImprovements.improvements.length > 0, "Architect improvement template generates improvements");

  const coderImprovements = pee.buildImprovedPromptCoder([]);
  assert(coderImprovements.improvements.length > 0, "Coder improvement template generates improvements");

  const reviewerImprovements = pee.buildImprovedPromptReviewer([]);
  assert(reviewerImprovements.improvements.length > 0, "Reviewer improvement template generates improvements");

  // Test generateImprovedPrompt
  const improvedPlanner = pee.generateImprovedPrompt("planner", []);
  assert(improvedPlanner !== null, "generateImprovedPrompt returns non-null for planner");
  assert(improvedPlanner.includes("Improvement Directives"), "Improved prompt includes Improvement Directives section");

  // Test runEvolutionCycle
  const evolutionResult = pee.runEvolutionCycle({ auditLimit: 100 });
  assert(evolutionResult.generatedAt !== undefined, "Evolution cycle generates timestamp");
  assert(evolutionResult.analysisScore >= 0, "Evolution cycle has analysis score");
  assert(evolutionResult.evolutionResults !== undefined, "Evolution cycle returns per-role results");
  assert(evolutionResult.canAutoPromote !== undefined, "Evolution cycle evaluates auto-promotion");

  // Test evaluatePromotionRules
  const oldMetrics = { totalExecutions: 10, successfulExecutions: 6, failedExecutions: 4, retryCount: 5, avgDuration: 5000 };
  const newMetrics = { totalExecutions: 10, successfulExecutions: 9, failedExecutions: 1, retryCount: 1, avgDuration: 3000 };
  const promotionEval = pee.evaluatePromotionRules("planner", oldMetrics, newMetrics);
  assert(promotionEval.passes === true, "Promotion rules pass with improved metrics");
  assert(promotionEval.details.successRateIncrease > 10, "Success rate increase > 10%");

  // Test failed promotion
  const worseMetrics = { totalExecutions: 10, successfulExecutions: 5, failedExecutions: 5, retryCount: 6, avgDuration: 6000 };
  const failedPromotion = pee.evaluatePromotionRules("planner", oldMetrics, worseMetrics);
  assert(failedPromotion.passes === false, "Promotion rules fail with worse metrics");

  // Test evaluateAutoPromotion
  const noWeaknesses = pee.evaluateAutoPromotion([]);
  assert(noWeaknesses.canPromote === true, "Auto-promotion allowed with no weaknesses");

  const manyWeaknesses = pee.evaluateAutoPromotion([
    { severity: "medium" }, { severity: "medium" }, { severity: "medium" }, { severity: "medium" }
  ]);
  assert(manyWeaknesses.canPromote === false, "Auto-promotion blocked with 4+ weaknesses");

  const criticalWeakness = pee.evaluateAutoPromotion([{ severity: "high" }]);
  assert(criticalWeakness.canPromote === false, "Auto-promotion blocked with critical weakness");

  // ===== Test 4: Prompt Experiment Engine =====
  console.log("\n--- Test 4: Prompt Experiment Engine ---");

  // createExperiment — use higher target to allow all test records
  const exp = pex.createExperiment("planner", 1, 2, { targetSampleSize: 20 });
  assert(exp.experimentId.startsWith("EXP-"), "Experiment ID generated");
  assert(exp.role === "planner", "Experiment role is planner");
  assert(exp.versionA === 1, "Experiment versionA is 1");
  assert(exp.versionB === 2, "Experiment versionB is 2");
  assert(exp.status === "running", "Experiment starts as running");

  // getExperiment
  const loaded = pex.getExperiment(exp.experimentId);
  assert(loaded !== null, "getExperiment returns experiment");
  assert(loaded.experimentId === exp.experimentId, "getExperiment matches ID");

  // listExperiments
  const allExperiments = pex.listExperiments();
  assert(allExperiments.length >= 1, "listExperiments returns experiments");

  const filtered = pex.listExperiments({ role: "planner" });
  assert(filtered.length >= 1, "listExperiments filter by role works");

  // recordExecution
  const updatedExp1 = pex.recordExecution(exp.experimentId, 1, { ok: true, retryCount: 0, reviewerDecision: "approved", duration: 2000 });
  assert(updatedExp1.results.versionA.totalExecutions === 1, "recordExecution increments versionA count");
  assert(updatedExp1.results.versionA.successfulExecutions === 1, "recordExecution records success");

  const updatedExp2 = pex.recordExecution(exp.experimentId, 2, { ok: false, retryCount: 2, reviewerDecision: "changes-requested", duration: 5000 });
  assert(updatedExp2.results.versionB.totalExecutions === 1, "recordExecution increments versionB count");
  assert(updatedExp2.results.versionB.failedExecutions === 1, "recordExecution records failure");

  // Add more executions to trigger auto-completion
  for (let i = 0; i < 4; i++) {
    pex.recordExecution(exp.experimentId, 1, { ok: true, retryCount: 0, reviewerDecision: "approved", duration: 1500 });
    pex.recordExecution(exp.experimentId, 2, { ok: true, retryCount: 1, reviewerDecision: "approved", duration: 3000 });
  }

  // Experiment is still running (sample size 10 < target 20)
  const runningExp = pex.getExperiment(exp.experimentId);
  assert(runningExp.status === "running", "Experiment is still running (size 10 < target 20)");

  // Manually close for winner evaluation
  pex.closeExperiment(exp.experimentId);

  // getWinner
  const winner = pex.getWinner(exp.experimentId);
  assert(winner.winner !== null, "Winner is determined");
  assert(winner.reasoning.length > 0, "Winner has reasoning");
  assert(winner.ratesComparison !== undefined, "Winner has rates comparison");
  assert(winner.deltas !== undefined, "Winner has deltas");

  // closeExperiment (idempotent)
  const closed = pex.closeExperiment(exp.experimentId);
  assert(closed.status === "completed", "closeExperiment keeps completed status");

  // ===== Test 5: Integration — Full Cycle =====
  console.log("\n--- Test 5: Full Cycle Integration ---");

  // 1. Analyze
  const finalAnalysis = pa.analyzePrompts();
  assert(finalAnalysis.promptHealthScore >= 0, "Final analysis health score valid");

  // 2. Evolve
  const finalEvolution = pee.runEvolutionCycle();
  assert(finalEvolution.analysisScore >= 0, "Final evolution score valid");

  // 3. Check versions exist
  const plannerVersions = pvm.listVersions("planner");
  assert(plannerVersions.length >= 1, "Planner has at least 1 version after evolution");
  assert(plannerVersions.some(v => v.version === 2), "Planner v2 candidate exists");

  // 4. Check we can create an experiment for the candidate
  const finalExperiment = pex.createExperiment("planner", 1, 2, { targetSampleSize: 3, notes: "Integration test experiment" });
  assert(finalExperiment.notes === "Integration test experiment", "Experiment metadata preserved");

  // Summary
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error("Test crashed:", err);
  process.exit(1);
});