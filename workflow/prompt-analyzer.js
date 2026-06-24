/**
 * prompt-analyzer.js
 * Phase 9: Prompt Self-Improving System — Analysis Module.
 * Consumes audit logs, metrics, and lessons learned to detect prompt weaknesses.
 *
 * Inputs:
 *   - Audit logs (logs/audit.jsonl)
 *   - Metrics (metrics/agent-performance.json, task-metrics.json, learning-metrics.json)
 *   - Health report (health/framework-status.json)
 *
 * Output:
 *   PromptWeaknessReport — structured list of weaknesses per agent role.
 *
 * Constraints:
 *   - Additive only.
 *   - Read-only analysis.
 *   - Does NOT modify prompts directly.
 */

const fs = require("fs");
const path = require("path");

// ---- File Readers ----

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8"));
    return null;
  } catch (err) { return null; }
}

function readAuditLog(limit = 1000) {
  const auditPath = path.join(process.cwd(), "logs", "audit.jsonl");
  if (!fs.existsSync(auditPath)) return [];
  try {
    const content = fs.readFileSync(auditPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    const records = [];
    for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
      try { records.push(JSON.parse(lines[i])); } catch (e) { /* skip */ }
    }
    return records;
  } catch (err) { return []; }
}

// ---- Pattern Detectors ----

function detectCommonErrors(auditRecords) {
  // Look for agent-executed events with ok:false to identify frequent failure modes
  const failedExecutions = auditRecords.filter(r =>
    r.eventType === "agent-executed" && r.payload && r.payload.ok === false
  );

  // Group by agent role
  const byAgent = {};
  failedExecutions.forEach(r => {
    const agent = r.payload.agent || r.actor || "unknown";
    if (!byAgent[agent]) byAgent[agent] = { failures: [], errorMessages: [] };
    byAgent[agent].failures.push(r);
    if (r.payload.validation && r.payload.validation.errors) {
      byAgent[agent].errorMessages.push(...r.payload.validation.errors);
    }
  });

  const weaknesses = [];
  Object.keys(byAgent).forEach(agent => {
    const data = byAgent[agent];
    if (data.failures.length >= 2) {
      // Find top error messages
      const errorCounts = {};
      data.errorMessages.forEach(msg => {
        const key = msg.substring(0, 80);
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
      const topErrors = Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([msg, count]) => ({ message: msg, count }));

      weaknesses.push({
        type: "common-error",
        severity: data.failures.length >= 5 ? "high" : "medium",
        agent,
        detail: `${data.failures.length} failed executions for agent "${agent}"`,
        failureCount: data.failures.length,
        topErrors
      });
    }
  });

  return weaknesses;
}

function detectRetryHotspots(auditRecords) {
  // Look for agent-transitioned events with action:retry
  const retries = auditRecords.filter(r =>
    r.eventType === "agent-transitioned" && r.payload && r.payload.action === "retry"
  );

  // Group by agent
  const byAgent = {};
  retries.forEach(r => {
    const agent = r.payload.fromAgent || r.actor || "unknown";
    if (!byAgent[agent]) byAgent[agent] = 0;
    byAgent[agent]++;
  });

  const weaknesses = [];
  Object.keys(byAgent).forEach(agent => {
    const count = byAgent[agent];
    if (count >= 2) {
      weaknesses.push({
        type: "retry-hotspot",
        severity: count >= 5 ? "high" : "medium",
        agent,
        detail: `Agent "${agent}" triggered ${count} retries`,
        retryCount: count
      });
    }
  });

  return weaknesses;
}

function detectPhantomPatterns(auditRecords) {
  // Detect events that emit without expected correlation
  const agentExecuted = auditRecords.filter(r => r.eventType === "agent-executed");
  const artifactWritten = auditRecords.filter(r => r.eventType === "artifact-written");

  // Agents that executed but left no artifact
  const executedWithoutArtifact = agentExecuted.filter(ae => {
    const taskId = ae.correlationId;
    if (!taskId) return false;
    return !artifactWritten.some(aw => aw.correlationId === taskId);
  });

  const weaknesses = [];
  if (executedWithoutArtifact.length >= 3) {
    const agents = [...new Set(executedWithoutArtifact.map(e => e.payload.agent || e.actor))];
    weaknesses.push({
      type: "phantom-execution",
      severity: "medium",
      agent: agents.join(","),
      detail: `${executedWithoutArtifact.length} executions without corresponding artifacts`,
      count: executedWithoutArtifact.length,
      agents
    });
  }

  return weaknesses;
}

function detectMissingArtifactPatterns(auditRecords) {
  // Detect repeated failure to produce artifacts for specific agents
  const byAgent = {};
  auditRecords.forEach(r => {
    if (r.eventType === "agent-executed" && r.payload) {
      const agent = r.payload.agent || r.actor || "unknown";
      if (!byAgent[agent]) byAgent[agent] = { total: 0, withArtifact: 0, withoutArtifact: 0 };
      byAgent[agent].total++;

      // Check if a corresponding artifact-written exists for this correlation
      const corrId = r.correlationId;
      const hasArtifact = auditRecords.some(aw =>
        aw.eventType === "artifact-written" && aw.correlationId === corrId
      );
      if (hasArtifact) byAgent[agent].withArtifact++;
      else byAgent[agent].withoutArtifact++;
    }
  });

  const weaknesses = [];
  Object.keys(byAgent).forEach(agent => {
    const data = byAgent[agent];
    const missingRatio = data.withoutArtifact / Math.max(data.total, 1);
    if (missingRatio > 0.3 && data.withoutArtifact >= 2) {
      weaknesses.push({
        type: "missing-artifact",
        severity: missingRatio > 0.6 ? "high" : "medium",
        agent,
        detail: `Agent "${agent}" missing artifacts in ${data.withoutArtifact}/${data.total} executions (${Math.round(missingRatio * 100)}%)`,
        missingCount: data.withoutArtifact,
        totalCount: data.total,
        missingRatio
      });
    }
  });

  return weaknesses;
}

function detectHealingDependency(auditRecords) {
  // Detect agents that consistently require healing cycles after execution
  const healingAfter = auditRecords.filter(r => r.eventType === "healing-cycle-completed");
  if (healingAfter.length < 2) return [];

  // Count how many unique tasks went through healing
  const uniqueTasks = new Set(healingAfter.map(r => r.correlationId).filter(Boolean));
  if (uniqueTasks.size >= 2) {
    return [{
      type: "healing-dependency",
      severity: uniqueTasks.size >= 5 ? "high" : "medium",
      agent: "coder",
      detail: `${healingAfter.length} healing cycles across ${uniqueTasks.size} unique tasks`,
      healingCount: healingAfter.length,
      uniqueTasks: uniqueTasks.size
    }];
  }
  return [];
}

// ---- Main Analysis ----

function analyzePrompts(options = {}) {
  const auditRecords = readAuditLog(options.auditLimit || 1000);
  const agentMetrics = readJsonFile(path.join(process.cwd(), "metrics", "agent-performance.json"));
  const learningMetrics = readJsonFile(path.join(process.cwd(), "metrics", "learning-metrics.json"));

  const weaknesses = [
    ...detectCommonErrors(auditRecords),
    ...detectRetryHotspots(auditRecords),
    ...detectPhantomPatterns(auditRecords),
    ...detectMissingArtifactPatterns(auditRecords),
    ...detectHealingDependency(auditRecords)
  ];

  // Score prompt health (0-100)
  let promptHealthScore = 100;
  weaknesses.forEach(w => {
    promptHealthScore -= w.severity === "high" ? 15 : 8;
  });
  promptHealthScore = Math.max(0, Math.min(100, promptHealthScore));

  const report = {
    generatedAt: new Date().toISOString(),
    promptHealthScore,
    weaknessesFound: weaknesses.length,
    weaknesses,
    summary: {
      auditRecordsAnalyzed: auditRecords.length,
      agentsWithWeaknesses: [...new Set(weaknesses.map(w => w.agent))],
      topWeaknessTypes: [...new Set(weaknesses.map(w => w.type))],
      totalRetries: auditRecords.filter(r => r.eventType === "agent-transitioned" && r.payload?.action === "retry").length,
      totalHealingCycles: auditRecords.filter(r => r.eventType === "healing-cycle-completed").length,
      lessonsAvailable: learningMetrics?.lessonsLearned || 0
    }
  };

  return report;
}

function getWeaknessReport() {
  return readJsonFile(path.join(process.cwd(), "reports", "prompt-weakness-report.json"));
}

module.exports = {
  analyzePrompts,
  getWeaknessReport,
  // Exposed for testing
  detectCommonErrors,
  detectRetryHotspots,
  detectPhantomPatterns,
  detectMissingArtifactPatterns,
  detectHealingDependency
};