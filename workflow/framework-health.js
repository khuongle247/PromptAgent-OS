/**
 * framework-health.js
 * Phase 8: Framework Health Engine.
 * Consumes AuditEngine and MetricsEngine outputs to generate health reports,
 * detect bottlenecks/risks, and produce actionable recommendations.
 *
 * Usage:
 *   const fh = require("./framework-health");
 *   const report = fh.generateHealthReport();
 *   console.log(report.score, report.status);
 *
 * Constraints:
 *   - Additive only
 *   - Reads generated files (metrics/*.json, logs/audit.jsonl)
 *   - No direct modification of workflow execution
 */

const fs = require("fs");
const path = require("path");

const HEALTH_DIR = path.join(process.cwd(), "health");
const HEALTH_STATUS_PATH = path.join(HEALTH_DIR, "framework-status.json");

// Thresholds
const RETRY_RATE_THRESHOLD = 0.2;       // 20% retry rate triggers bottleneck
const FAILURE_RATE_THRESHOLD = 0.2;     // 20% failure rate triggers risk
const HIGH_AVG_DURATION_MS = 10000;     // 10s average triggers bottleneck
const HEALING_CYCLE_THRESHOLD = 3;      // 3+ healing cycles in window triggers risk
const LESSON_IMPORTANCE_BOOST = 1;      // Each lesson learned adds 1 point
const MEMORY_CONFLICT_THRESHOLD = 5;    // 5+ importance changes triggers memory risk
const PROMPT_DEGRADATION_THRESHOLD = 0.3; // 30%+ retry rate triggers prompt degradation

// ---- File Readers ----

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    return null;
  } catch (err) {
    return null;
  }
}

function readAgentMetrics() {
  return readJsonFile(path.join(process.cwd(), "metrics", "agent-performance.json"));
}

function readTaskMetrics() {
  return readJsonFile(path.join(process.cwd(), "metrics", "task-metrics.json"));
}

function readLearningMetrics() {
  return readJsonFile(path.join(process.cwd(), "metrics", "learning-metrics.json"));
}

function readAuditLog(limit = 500) {
  const auditPath = path.join(process.cwd(), "logs", "audit.jsonl");
  if (!fs.existsSync(auditPath)) return [];

  try {
    const content = fs.readFileSync(auditPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    // Take most recent entries
    const records = [];
    for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
      try {
        records.push(JSON.parse(lines[i]));
      } catch (e) {
        // skip malformed
      }
    }
    return records;
  } catch (err) {
    return [];
  }
}

// ---- Bottleneck Detectors ----

function detectRetryRateBottleneck(agentMetrics) {
  if (!agentMetrics || agentMetrics.totalExecutions === 0) return null;

  const retryRate = agentMetrics.totalExecutions > 0
    ? agentMetrics.retryCount / agentMetrics.totalExecutions
    : 0;

  if (retryRate > RETRY_RATE_THRESHOLD) {
    return {
      type: "high-retry-rate",
      severity: retryRate > 0.5 ? "critical" : "warning",
      detail: `Agent retry rate is ${(retryRate * 100).toFixed(1)}% (${agentMetrics.retryCount}/${agentMetrics.totalExecutions})`,
      value: retryRate,
      threshold: RETRY_RATE_THRESHOLD
    };
  }
  return null;
}

function detectHighDurationBottleneck(agentMetrics) {
  if (!agentMetrics || !agentMetrics.avgDuration) return null;

  if (agentMetrics.avgDuration > HIGH_AVG_DURATION_MS) {
    return {
      type: "high-avg-duration",
      severity: agentMetrics.avgDuration > HIGH_AVG_DURATION_MS * 2 ? "critical" : "warning",
      detail: `Average execution duration is ${agentMetrics.avgDuration}ms (threshold: ${HIGH_AVG_DURATION_MS}ms)`,
      value: agentMetrics.avgDuration,
      threshold: HIGH_AVG_DURATION_MS
    };
  }
  return null;
}

function detectHealingCycleBottleneck(auditRecords) {
  const healingCycles = auditRecords.filter(r => r.eventType === "healing-cycle-completed");
  const recentHealingCycles = healingCycles.filter(r => {
    const age = Date.now() - new Date(r.timestamp).getTime();
    return age < 3600000; // Last 1 hour
  });

  if (recentHealingCycles.length >= HEALING_CYCLE_THRESHOLD) {
    return {
      type: "excessive-healing-cycles",
      severity: recentHealingCycles.length >= HEALING_CYCLE_THRESHOLD * 2 ? "critical" : "warning",
      detail: `${recentHealingCycles.length} healing cycles in the last hour (threshold: ${HEALING_CYCLE_THRESHOLD})`,
      value: recentHealingCycles.length,
      threshold: HEALING_CYCLE_THRESHOLD
    };
  }
  return null;
}

// ---- Risk Detectors ----

function detectRecurringBugPatterns(auditRecords) {
  const bugRecords = auditRecords.filter(r => r.eventType === "bug-pattern-recorded");
  const recentBugs = bugRecords.filter(r => {
    const age = Date.now() - new Date(r.timestamp).getTime();
    return age < 86400000; // Last 24 hours
  });

  if (recentBugs.length >= 3) {
    return {
      type: "recurring-bug-patterns",
      severity: recentBugs.length >= 10 ? "critical" : "warning",
      detail: `${recentBugs.length} bug patterns recorded in the last 24 hours`,
      value: recentBugs.length,
      threshold: 3
    };
  }
  return null;
}

function detectFailureRateRisk(agentMetrics) {
  if (!agentMetrics || agentMetrics.totalExecutions === 0) return null;

  const failureRate = agentMetrics.totalExecutions > 0
    ? agentMetrics.failedExecutions / agentMetrics.totalExecutions
    : 0;

  if (failureRate > FAILURE_RATE_THRESHOLD) {
    return {
      type: "high-failure-rate",
      severity: failureRate > 0.5 ? "critical" : "warning",
      detail: `Agent failure rate is ${(failureRate * 100).toFixed(1)}% (${agentMetrics.failedExecutions}/${agentMetrics.totalExecutions})`,
      value: failureRate,
      threshold: FAILURE_RATE_THRESHOLD
    };
  }
  return null;
}

function detectMemoryConflicts(learningMetrics) {
  if (!learningMetrics) return null;

  // High memory update count relative to lessons can indicate churn
  if (learningMetrics.memoryUpdates >= MEMORY_CONFLICT_THRESHOLD &&
      learningMetrics.lessonsLearned > 0 &&
      learningMetrics.memoryUpdates > learningMetrics.lessonsLearned * 2) {
    return {
      type: "memory-conflict-churn",
      severity: "warning",
      detail: `Memory updates (${learningMetrics.memoryUpdates}) are ${(learningMetrics.memoryUpdates / Math.max(learningMetrics.lessonsLearned, 1)).toFixed(1)}x lessons learned — potential churn`,
      value: learningMetrics.memoryUpdates / Math.max(learningMetrics.lessonsLearned, 1),
      threshold: 2
    };
  }
  return null;
}

function detectPromptDegradation(agentMetrics) {
  if (!agentMetrics || agentMetrics.totalExecutions === 0) return null;

  const retryRate = agentMetrics.retryCount / agentMetrics.totalExecutions;
  if (retryRate > PROMPT_DEGRADATION_THRESHOLD) {
    return {
      type: "prompt-degradation",
      severity: retryRate > 0.5 ? "critical" : "warning",
      detail: `High retry rate (${(retryRate * 100).toFixed(1)}%) may indicate prompt degradation`,
      value: retryRate,
      threshold: PROMPT_DEGRADATION_THRESHOLD
    };
  }
  return null;
}

function detectTaskFailureRateRisk(taskMetrics) {
  if (!taskMetrics || taskMetrics.totalTasks === 0) return null;

  const taskFailureRate = taskMetrics.totalTasks > 0
    ? taskMetrics.failedTasks / taskMetrics.totalTasks
    : 0;

  if (taskFailureRate > FAILURE_RATE_THRESHOLD) {
    return {
      type: "high-task-failure-rate",
      severity: taskFailureRate > 0.5 ? "critical" : "warning",
      detail: `Task failure rate is ${(taskFailureRate * 100).toFixed(1)}% (${taskMetrics.failedTasks}/${taskMetrics.totalTasks})`,
      value: taskFailureRate,
      threshold: FAILURE_RATE_THRESHOLD
    };
  }
  return null;
}

// ---- Scoring ----

function calculateHealthScore(agentMetrics, taskMetrics, learningMetrics, bottlenecks, risks) {
  let score = 100;

  // Agent metrics deductions
  if (agentMetrics) {
    // Retry penalty
    score -= agentMetrics.retryCount * 5;

    // Failure penalty
    score -= agentMetrics.failedExecutions * 10;

    // Duration penalty (if above 5s threshold)
    if (agentMetrics.avgDuration > 5000) {
      const durationPenalty = Math.min(20, Math.floor((agentMetrics.avgDuration - 5000) / 1000));
      score -= durationPenalty;
    }
  }

  // Task metrics deductions
  if (taskMetrics) {
    // Failed task penalty
    score -= taskMetrics.failedTasks * 8;

    // Healing penalty (each completed task that required healing implies overhead)
    if (taskMetrics.totalTasks > 0) {
      const healingOverhead = Math.max(0, taskMetrics.totalTasks - taskMetrics.completedTasks - taskMetrics.failedTasks);
      score -= healingOverhead * 3;
    }
  }

  // Learning metrics boosts
  if (learningMetrics) {
    score += learningMetrics.lessonsLearned * LESSON_IMPORTANCE_BOOST;
    score += learningMetrics.reusablePatterns * 2;
  }

  // Bottleneck penalty
  bottlenecks.forEach(b => {
    score -= b.severity === "critical" ? 15 : 8;
  });

  // Risk penalty
  risks.forEach(r => {
    score -= r.severity === "critical" ? 10 : 5;
  });

  // Clamp
  return Math.max(0, Math.min(100, score));
}

function determineStatus(score) {
  if (score >= 80) return "healthy";
  if (score >= 40) return "degraded";
  return "critical";
}

// ---- Recommendation Engine ----

function generateRecommendations(bottlenecks, risks, agentMetrics, learningMetrics) {
  const recommendations = [];
  const usedKeys = new Set();

  // Recommendations based on bottlenecks
  bottlenecks.forEach(b => {
    switch (b.type) {
      case "high-retry-rate": {
        if (!usedKeys.has("optimize-prompt")) {
          recommendations.push({
            id: "REC-OPTIMIZE-PROMPT",
            priority: b.severity === "critical" ? "high" : "medium",
            category: "prompt-engineering",
            description: "High retry rate detected. Review and optimize agent prompts to improve first-pass success rate.",
            action: "Improve Planner prompt with clearer instructions and stricter output format requirements."
          });
          usedKeys.add("optimize-prompt");
        }
        if (!usedKeys.has("add-validation")) {
          recommendations.push({
            id: "REC-ADD-VALIDATION",
            priority: "medium",
            category: "validation",
            description: "Add pre-execution validation for Architect outputs to catch errors before coder execution.",
            action: "Add validation for Architect outputs"
          });
          usedKeys.add("add-validation");
        }
        break;
      }
      case "high-avg-duration": {
        if (!usedKeys.has("reduce-complexity")) {
          recommendations.push({
            id: "REC-REDUCE-COMPLEXITY",
            priority: "medium",
            category: "performance",
            description: `Average execution duration (${b.value}ms) is high. Consider breaking tasks into smaller units.`,
            action: "Reduce task complexity by splitting large tasks into smaller, focused subtasks."
          });
          usedKeys.add("reduce-complexity");
        }
        break;
      }
      case "excessive-healing-cycles": {
        if (!usedKeys.has("improve-debugging")) {
          recommendations.push({
            id: "REC-IMPROVE-DEBUGGING",
            priority: b.severity === "critical" ? "high" : "medium",
            category: "self-healing",
            description: `${b.detail}. Too many healing cycles indicate systemic issues.`,
            action: "Improve debugger root cause analysis and coder fix generation to reduce healing cycles."
          });
          usedKeys.add("improve-debugging");
        }
        break;
      }
    }
  });

  // Recommendations based on risks
  risks.forEach(r => {
    switch (r.type) {
      case "recurring-bug-patterns": {
        if (!usedKeys.has("add-bug-tests")) {
          recommendations.push({
            id: "REC-ADD-BUG-TESTS",
            priority: r.severity === "critical" ? "high" : "medium",
            category: "quality",
            description: `${r.detail}. Recurring bug patterns suggest gaps in test coverage or code review.`,
            action: "Add regression tests for identified bug patterns and strengthen reviewer validation criteria."
          });
          usedKeys.add("add-bug-tests");
        }
        break;
      }
      case "high-failure-rate":
      case "high-task-failure-rate": {
        if (!usedKeys.has("escalate-errors")) {
          recommendations.push({
            id: "REC-ESCALATE-ERRORS",
            priority: r.severity === "critical" ? "high" : "medium",
            category: "error-handling",
            description: `${r.detail}. High failure rates may indicate systemic issues requiring manual intervention.`,
            action: "Escalate repeated failures to human review. Consider increasing memory importance threshold for recurring failures."
          });
          usedKeys.add("escalate-errors");
        }
        break;
      }
      case "memory-conflict-churn": {
        if (!usedKeys.has("increase-memory-threshold")) {
          recommendations.push({
            id: "REC-INCREASE-MEMORY-THRESHOLD",
            priority: "low",
            category: "memory-management",
            description: `${r.detail}. Frequent memory importance updates suggest churn.`,
            action: "Increase memory importance threshold"
          });
          usedKeys.add("increase-memory-threshold");
        }
        break;
      }
      case "prompt-degradation": {
        if (!usedKeys.has("review-prompts")) {
          recommendations.push({
            id: "REC-REVIEW-PROMPTS",
            priority: r.severity === "critical" ? "high" : "medium",
            category: "prompt-engineering",
            description: `${r.detail}. Prompts may need updating to maintain effectiveness.`,
            action: "Review all agent prompts for clarity, completeness, and alignment with current task complexity."
          });
          usedKeys.add("review-prompts");
        }
        break;
      }
    }
  });

  // General recommendations based on metrics gaps
  if (learningMetrics) {
    if (learningMetrics.lessonsLearned === 0 && learningMetrics.memoryUpdates === 0) {
      recommendations.push({
        id: "REC-BOOTSTRAP-LEARNING",
        priority: "low",
        category: "learning",
        description: "No lessons or memory updates recorded. The learning loop may not be active.",
        action: "Verify learning-loop-engine is properly connected to the execution pipeline."
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "REC-NO-ISSUES",
      priority: "low",
      category: "general",
      description: "No issues detected. Continue monitoring framework health.",
      action: "Maintain current configuration and monitoring."
    });
  }

  return recommendations;
}

// ---- Health Report Generator ----

function generateHealthReport() {
  // Read metrics
  const agentMetrics = readAgentMetrics() || {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    retryCount: 0,
    avgDuration: 0
  };

  const taskMetrics = readTaskMetrics() || {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgCycleTime: 0
  };

  const learningMetrics = readLearningMetrics() || {
    lessonsLearned: 0,
    reusablePatterns: 0,
    memoryUpdates: 0
  };

  const auditRecords = readAuditLog(500);

  // Detect bottlenecks
  const bottlenecks = [
    detectRetryRateBottleneck(agentMetrics),
    detectHighDurationBottleneck(agentMetrics),
    detectHealingCycleBottleneck(auditRecords)
  ].filter(Boolean);

  // Detect risks
  const risks = [
    detectRecurringBugPatterns(auditRecords),
    detectFailureRateRisk(agentMetrics),
    detectMemoryConflicts(learningMetrics),
    detectPromptDegradation(agentMetrics),
    detectTaskFailureRateRisk(taskMetrics)
  ].filter(Boolean);

  // Compute score and status
  const score = calculateHealthScore(agentMetrics, taskMetrics, learningMetrics, bottlenecks, risks);
  const status = determineStatus(score);

  // Generate recommendations
  const recommendations = generateRecommendations(bottlenecks, risks, agentMetrics, learningMetrics);

  // Build report
  const report = {
    score,
    status,
    generatedAt: new Date().toISOString(),
    summary: {
      totalExecutions: agentMetrics.totalExecutions,
      totalTasks: taskMetrics.totalTasks,
      successRate: agentMetrics.totalExecutions > 0
        ? Math.round((agentMetrics.successfulExecutions / agentMetrics.totalExecutions) * 100)
        : 0,
      failureRate: agentMetrics.totalExecutions > 0
        ? Math.round((agentMetrics.failedExecutions / agentMetrics.totalExecutions) * 100)
        : 0,
      retryRate: agentMetrics.totalExecutions > 0
        ? Math.round((agentMetrics.retryCount / agentMetrics.totalExecutions) * 100)
        : 0,
      avgDuration: agentMetrics.avgDuration,
      lessonsLearned: learningMetrics.lessonsLearned,
      reusablePatterns: learningMetrics.reusablePatterns,
      bottlenecksFound: bottlenecks.length,
      risksFound: risks.length
    },
    bottlenecks,
    risks,
    recommendations
  };

  // Persist
  ensureHealthDir();
  fs.writeFileSync(HEALTH_STATUS_PATH, JSON.stringify(report, null, 2));

  return report;
}

function ensureHealthDir() {
  if (!fs.existsSync(HEALTH_DIR)) {
    fs.mkdirSync(HEALTH_DIR, { recursive: true });
  }
}

function getHealthReport() {
  return readJsonFile(HEALTH_STATUS_PATH);
}

module.exports = {
  generateHealthReport,
  getHealthReport,
  // Exposed for testing
  detectRetryRateBottleneck,
  detectHighDurationBottleneck,
  detectHealingCycleBottleneck,
  detectRecurringBugPatterns,
  detectFailureRateRisk,
  detectMemoryConflicts,
  detectPromptDegradation,
  detectTaskFailureRateRisk,
  calculateHealthScore,
  determineStatus,
  generateRecommendations
};