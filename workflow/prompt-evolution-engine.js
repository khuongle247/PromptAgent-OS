/**
 * prompt-evolution-engine.js
 * Phase 9: Prompt Self-Improving System — Evolution Engine.
 *
 * Orchestrates the evolution cycle:
 *   1. Analyze → detect weaknesses (delegates to prompt-analyzer)
 *   2. Improve → generate candidate prompt improvements
 *   3. Store   → save candidates via prompt-version-manager
 *   4. Promote → evaluate and promote if rules are satisfied
 *
 * Promotion Rules (auto-promote only if ALL pass):
 *   - successRate increase > 10%
 *   - retryRate decreases
 *   - ratings improve
 *
 * Safety:
 *   - Never automatically replaces broken prompts
 *   - All candidates require manual review flag unless auto-promotion rules pass
 *   - Existing agent prompts remain compatible
 *
 * External dependencies:
 *   - prompt-analyzer.js  (weakness detection)
 *   - prompt-version-manager.js  (version storage)
 *   - AuditEngine + MetricsEngine outputs (read-only)
 */

const path = require("path");
const fs = require("fs");
const { analyzePrompts, getWeaknessReport } = require("./prompt-analyzer");
const pvm = require("./prompt-version-manager");

// Thresholds for auto-promotion
const MIN_SUCCESS_RATE_INCREASE = 0.1; // 10% minimum improvement
const MIN_RETRY_RATE_DECREASE = 0.01; // 1% minimum decrease

// ---- Improved Prompt Templates ----

function buildImprovedPromptPlanner(weaknesses) {
  let improvements = [];
  let additionalSections = [];

  weaknesses.forEach(w => {
    if (w.agent === "planner" && w.type === "common-error") {
      improvements.push("- Ensure all task IDs follow TASK-{NNN} pattern with valid estimates");
      improvements.push("- Include explicit validation checklist for each deliverable");
      additionalSections.push("## Validation Checklist");
      additionalSections.push("Before outputting, verify:");
      additionalSections.push("- [ ] All task IDs are unique and match TASK-{NNN}");
      additionalSections.push("- [ ] All dependencies reference existing task IDs");
      additionalSections.push("- [ ] Acceptance criteria are measurable and testable");
    }
    if (w.agent === "planner" && w.type === "retry-hotspot") {
      improvements.push("- Clarify task decomposition rules to avoid ambiguous splits");
      improvements.push("- Add explicit scope boundary definitions");
      additionalSections.push("## Scope Boundaries");
      additionalSections.push("Clearly define what is IN scope and OUT of scope for each task.");
    }
  });

  if (improvements.length === 0) {
    improvements.push("- Add explicit cross-reference to lessons learned from previous executions");
    improvements.push("- Include risk mitigation strategies per milestone");
  }

  return {
    improvements,
    additionalSections,
    rationale:
      weaknesses.length > 0
        ? `Improved based on ${weaknesses.length} detected weaknesses: ${weaknesses.map(w => w.type).join(", ")}`
        : "Proactive improvement based on execution patterns."
  };
}

function buildImprovedPromptArchitect(weaknesses) {
  let improvements = [];
  let additionalSections = [];

  weaknesses.forEach(w => {
    if (w.agent === "architect" && w.type === "missing-artifact") {
      improvements.push("- Ensure every architectural decision includes ADR file output");
      improvements.push("- Include integration point documentation requirement");
      additionalSections.push("## Integration Points");
      additionalSections.push("For each architectural decision, document:");
      additionalSections.push("- Internal integration points (module boundaries)");
      additionalSections.push("- External integration points (third-party APIs)");
      additionalSections.push("- Error scenarios at each integration boundary");
    }
    if (w.agent === "architect" && w.type === "common-error") {
      improvements.push("- Include explicit error scenario documentation for each component");
      improvements.push("- Add validation checklist for schema compliance");
      additionalSections.push("## Error Scenarios");
      additionalSections.push("Document potential failure modes for each architectural component:");
      additionalSections.push("- Input validation failures");
      additionalSections.push("- Service unavailability");
      additionalSections.push("- Data consistency violations");
    }
  });

  if (improvements.length === 0) {
    improvements.push("- Add cross-cutting concern documentation requirement");
    improvements.push("- Include performance and scalability considerations");
  }

  return {
    improvements,
    additionalSections,
    rationale:
      weaknesses.length > 0
        ? `Improved based on ${weaknesses.length} detected weaknesses`
        : "Proactive improvement for architecture quality."
  };
}

function buildImprovedPromptCoder(weaknesses) {
  let improvements = [];
  let additionalSections = [];

  weaknesses.forEach(w => {
    if (w.type === "phantom-execution" || w.type === "missing-artifact") {
      improvements.push("- Ensure all code changes are accompanied by corresponding test files");
      improvements.push("- Include artifact metadata in every output");
      additionalSections.push("## Artifact Requirements");
      additionalSections.push("Every execution must produce:");
      additionalSections.push("- Modified files with change summary");
      additionalSections.push("- Test results (passed/failed/skipped)");
      additionalSections.push("- Lint results");
    }
    if (w.type === "healing-dependency") {
      improvements.push("- Add defensive error handling in generated code");
      improvements.push("- Include edge case documentation for all logic branches");
      additionalSections.push("## Error Handling");
      additionalSections.push("For every function/method, document:");
      additionalSections.push("- Expected inputs and their validation");
      additionalSections.push("- Error states and recovery mechanisms");
    }
  });

  if (improvements.length === 0) {
    improvements.push("- Add unit test generation requirement");
    improvements.push("- Include code review readiness checklist");
  }

  return {
    improvements,
    additionalSections,
    rationale:
      weaknesses.length > 0
        ? `Improved based on ${weaknesses.length} detected weaknesses`
        : "Proactive improvement for code quality."
  };
}

function buildImprovedPromptReviewer(weaknesses) {
  let improvements = [];
  let additionalSections = [];

  weaknesses.forEach(w => {
    if (w.type === "common-error" || w.type === "retry-hotspot") {
      improvements.push("- Add explicit severity classification for each finding");
      improvements.push("- Include actionable remediation suggestions for every issue");
      additionalSections.push("## Review Classification");
      additionalSections.push("Classify each review finding as:");
      additionalSections.push("- P0-critical: Must fix before proceeding");
      additionalSections.push("- P1-high: Should fix; blocking if unresolved");
      additionalSections.push("- P2-medium: Should address in current cycle");
      additionalSections.push("- P3-low: Consider for future improvement");
      additionalSections.push("- P4-suggestion: Optional enhancement");
    }
  });

  if (improvements.length === 0) {
    improvements.push("- Add regression risk assessment requirement");
    improvements.push("- Include acceptance criteria verification checklist");
  }

  return {
    improvements,
    additionalSections,
    rationale:
      weaknesses.length > 0
        ? `Improved based on ${weaknesses.length} detected weaknesses`
        : "Proactive improvement for review quality."
  };
}

const PROMPT_BUILDERS = {
  planner: buildImprovedPromptPlanner,
  architect: buildImprovedPromptArchitect,
  coder: buildImprovedPromptCoder,
  reviewer: buildImprovedPromptReviewer,
  debugger: null // Debugger prompt is typically auto-generated; not evolved here
};

// ---- Improvement Generation ----

function readCurrentPrompt(role) {
  try {
    const active = pvm.getActiveVersion(role);
    return active.content;
  } catch (err) {
    const legacyPath = path.join(process.cwd(), "prompts", `${role}.md`);
    if (fs.existsSync(legacyPath)) return fs.readFileSync(legacyPath, "utf8");
    return "";
  }
}

function generateImprovedPrompt(role, weaknesses = []) {
  const currentContent = readCurrentPrompt(role);
  const builder = PROMPT_BUILDERS[role];
  if (!builder) return null;

  const analysis = builder(weaknesses);
  const relevantWeaknesses = weaknesses.filter(
    w => w.agent === role || w.agent === "coder" || w.agent.includes(",")
  );

  let improvedContent = currentContent;

  // Add improvement directives section
  if (analysis.improvements.length > 0) {
    improvedContent += "\n\n## Improvement Directives (Auto-generated)\n";
    improvedContent += "Based on execution analysis, the following improvements are applied:\n\n";
    analysis.improvements.forEach(imp => {
      improvedContent += imp + "\n";
    });
  }

  // Add additional sections
  if (analysis.additionalSections.length > 0) {
    improvedContent += "\n" + analysis.additionalSections.join("\n") + "\n";
  }

  // Add rationale footer
  improvedContent += "\n\n---\n";
  improvedContent += `*Evolution Rationale: ${analysis.rationale}*\n`;

  return improvedContent;
}

// ---- Evolution Orchestration ----

function runEvolutionCycle(options = {}) {
  const analysisReport = analyzePrompts({ auditLimit: options.auditLimit || 1000 });
  const weaknesses = analysisReport.weaknesses;
  const results = {};

  pvm.AGENT_ROLES.forEach(role => {
    const builder = PROMPT_BUILDERS[role];
    if (!builder) {
      results[role] = { evolved: false, reason: "No evolution template defined" };
      return;
    }

    const improvedContent = generateImprovedPrompt(role, weaknesses);
    if (!improvedContent || improvedContent.trim() === readCurrentPrompt(role).trim()) {
      results[role] = { evolved: false, reason: "No significant change detected" };
      return;
    }

    // Get current active version info
    let parentVersion = 1;
    try {
      const active = pvm.getActiveVersion(role);
      parentVersion = active.version;
    } catch (e) {
      /* fallback */
    }

    // Create candidate version
    const candidate = pvm.createCandidate(role, improvedContent, parentVersion);
    results[role] = {
      evolved: true,
      version: candidate.version,
      parentVersion: candidate.parentVersion,
      createdAt: candidate.createdAt,
      note: candidate.note
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    analysisScore: analysisReport.promptHealthScore,
    weaknessesFound: analysisReport.weaknessesFound,
    evolutionResults: results,
    canAutoPromote: evaluateAutoPromotion(weaknesses)
  };
}

// ---- Auto-Promotion Evaluation ----

function evaluateAutoPromotion(weaknesses) {
  // Only auto-promote if there are few weaknesses (system is relatively healthy)
  if (weaknesses.length > 3) {
    return {
      canPromote: false,
      reason: `Too many weaknesses (${weaknesses.length}) to auto-promote. Manual review required.`
    };
  }

  // Check severity: no critical weaknesses
  const hasCritical = weaknesses.some(w => w.severity === "high" || w.severity === "critical");
  if (hasCritical) {
    return {
      canPromote: false,
      reason: "Critical weaknesses detected. Manual review required before promotion."
    };
  }

  return {
    canPromote: true,
    reason: "Few weaknesses, none critical. Auto-promotion may proceed after validation."
  };
}

function evaluatePromotionRules(role, oldMetrics, newMetrics) {
  // Promotion requires:
  // 1. Success rate increase > 10%
  // 2. Retry rate decrease
  // 3. Ratings improve

  const errors = [];
  let passes = true;

  // Check success rate improvement
  const oldSuccessRate =
    oldMetrics.totalExecutions > 0
      ? oldMetrics.successfulExecutions / oldMetrics.totalExecutions
      : 0;
  const newSuccessRate =
    newMetrics.totalExecutions > 0
      ? newMetrics.successfulExecutions / newMetrics.totalExecutions
      : 0;
  const successRateIncrease = newSuccessRate - oldSuccessRate;

  // Check retry rate decrease
  const oldRetryRate =
    oldMetrics.totalExecutions > 0 ? oldMetrics.retryCount / oldMetrics.totalExecutions : 0;
  const newRetryRate =
    newMetrics.totalExecutions > 0 ? newMetrics.retryCount / newMetrics.totalExecutions : 0;
  const retryRateDecrease = oldRetryRate - newRetryRate;

  // Check ratings (approval rate proxy)
  const oldApprovalRate =
    oldMetrics.totalExecutions > 0
      ? oldMetrics.successfulExecutions / oldMetrics.totalExecutions
      : 0;
  const newApprovalRate =
    newMetrics.totalExecutions > 0
      ? newMetrics.successfulExecutions / newMetrics.totalExecutions
      : 0;
  const ratingImprovement = newApprovalRate - oldApprovalRate;

  if (successRateIncrease < MIN_SUCCESS_RATE_INCREASE) {
    errors.push(
      `Success rate increase (${(successRateIncrease * 100).toFixed(1)}%) < ${MIN_SUCCESS_RATE_INCREASE * 100}% threshold`
    );
    passes = false;
  }

  if (retryRateDecrease <= 0) {
    errors.push(
      `Retry rate did not decrease (old: ${(oldRetryRate * 100).toFixed(1)}%, new: ${(newRetryRate * 100).toFixed(1)}%)`
    );
    passes = false;
  }

  if (ratingImprovement <= 0) {
    errors.push(
      `Ratings did not improve (old: ${(oldApprovalRate * 100).toFixed(1)}%, new: ${(newApprovalRate * 100).toFixed(1)}%)`
    );
    passes = false;
  }

  return {
    passes,
    details: {
      successRateIncrease: parseFloat((successRateIncrease * 100).toFixed(1)),
      retryRateDecrease: parseFloat((retryRateDecrease * 100).toFixed(1)),
      ratingImprovement: parseFloat((ratingImprovement * 100).toFixed(1)),
      thresholds: {
        minSuccessRateIncrease: MIN_SUCCESS_RATE_INCREASE,
        minRetryRateDecrease: MIN_RETRY_RATE_DECREASE
      }
    },
    errors
  };
}

function getEvolutionReport() {
  try {
    const reportPath = path.join(process.cwd(), "reports", "evolution-report.json");
    if (fs.existsSync(reportPath)) return JSON.parse(fs.readFileSync(reportPath, "utf8"));
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  runEvolutionCycle,
  generateImprovedPrompt,
  evaluatePromotionRules,
  evaluateAutoPromotion,
  getEvolutionReport,
  // Exposed for testing
  PROMPT_BUILDERS,
  buildImprovedPromptPlanner,
  buildImprovedPromptArchitect,
  buildImprovedPromptCoder,
  buildImprovedPromptReviewer
};
