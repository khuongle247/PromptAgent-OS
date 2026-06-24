/**
 * prompt-experiment-engine.js
 * Phase 9: Prompt Self-Improving System — Experiment (A/B Testing) Engine.
 *
 * Manages A/B test experiments between prompt versions.
 * Supports:
 *   - Creating experiments (which role, which versions to compare)
 *   - Recording results per version
 *   - Comparing success/retry/approval rates
 *   - Determining the winning version
 *
 * Data persisted to: experiments/{experimentId}.json
 *
 * Constraints:
 *   - Additive only.
 *   - No modification of workflow execution. Experiments are observational.
 */

const fs = require("fs");
const path = require("path");

const EXPERIMENTS_DIR = path.join(process.cwd(), "experiments");

// ---- Helpers ----

function ensureExperimentsDir() {
  if (!fs.existsSync(EXPERIMENTS_DIR)) {
    fs.mkdirSync(EXPERIMENTS_DIR, { recursive: true });
  }
}

function generateExperimentId() {
  return `EXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function getExperimentFilePath(experimentId) {
  return path.join(EXPERIMENTS_DIR, `${experimentId}.json`);
}

// ---- Experiment CRUD ----

function createExperiment(role, versionA, versionB, options = {}) {
  ensureExperimentsDir();

  const experiment = {
    experimentId: generateExperimentId(),
    role,
    versionA,
    versionB,
    status: "running",
    createdAt: new Date().toISOString(),
    completedAt: null,
    sampleSize: 0,
    results: {
      versionA: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        retryCount: 0,
        reviewerApprovals: 0,
        reviewerRejections: 0,
        avgDuration: 0,
        durationSum: 0,
        durationCount: 0
      },
      versionB: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        retryCount: 0,
        reviewerApprovals: 0,
        reviewerRejections: 0,
        avgDuration: 0,
        durationSum: 0,
        durationCount: 0
      }
    },
    targetSampleSize: options.targetSampleSize || 10,
    minSampleSize: options.minSampleSize || 5,
    notes: options.notes || "",
    metadata: options.metadata || {}
  };

  fs.writeFileSync(getExperimentFilePath(experiment.experimentId), JSON.stringify(experiment, null, 2));
  return experiment;
}

function getExperiment(experimentId) {
  const filePath = getExperimentFilePath(experimentId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return null;
  }
}

function listExperiments(filter = {}) {
  ensureExperimentsDir();
  const files = fs.readdirSync(EXPERIMENTS_DIR).filter(f => f.endsWith(".json"));
  const experiments = [];

  files.forEach(f => {
    try {
      const exp = JSON.parse(fs.readFileSync(path.join(EXPERIMENTS_DIR, f), "utf8"));
      let matches = true;
      if (filter.status && exp.status !== filter.status) matches = false;
      if (filter.role && exp.role !== filter.role) matches = false;
      if (matches) experiments.push(exp);
    } catch (e) { /* skip */ }
  });

  return experiments;
}

// ---- Recording Results ----

function recordExecution(experimentId, version, executionResult) {
  const experiment = getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment ${experimentId} not found`);
  if (experiment.status === "completed") throw new Error(`Experiment ${experimentId} is already completed`);

  const versionKey = version === experiment.versionA ? "versionA" : 
                     version === experiment.versionB ? "versionB" : null;
  if (!versionKey) throw new Error(`Version ${version} is not part of experiment ${experimentId}`);

  const v = experiment.results[versionKey];
  v.totalExecutions++;

  if (executionResult.ok === true) {
    v.successfulExecutions++;
  } else {
    v.failedExecutions++;
  }

  if (executionResult.retryCount) {
    v.retryCount += executionResult.retryCount;
  }

  // Track reviewer approval
  if (executionResult.reviewerDecision === "approved") {
    v.reviewerApprovals++;
  } else if (executionResult.reviewerDecision === "changes-requested" || executionResult.reviewerDecision === "rejected") {
    v.reviewerRejections++;
  }

  // Track duration
  if (typeof executionResult.duration === "number") {
    v.durationSum += executionResult.duration;
    v.durationCount++;
    v.avgDuration = Math.round(v.durationSum / v.durationCount);
  }

  experiment.sampleSize = experiment.results.versionA.totalExecutions + experiment.results.versionB.totalExecutions;

  // Auto-complete if target sample size reached
  if (experiment.sampleSize >= experiment.targetSampleSize) {
    experiment.status = "completed";
    experiment.completedAt = new Date().toISOString();
  }

  fs.writeFileSync(getExperimentFilePath(experimentId), JSON.stringify(experiment, null, 2));
  return experiment;
}

// ---- Comparison & Winner ----

function compareVersions(experiment) {
  const a = experiment.results.versionA;
  const b = experiment.results.versionB;

  function calcRates(v) {
    const successRate = v.totalExecutions > 0 ? v.successfulExecutions / v.totalExecutions : 0;
    const retryRate = v.totalExecutions > 0 ? v.retryCount / v.totalExecutions : 0;
    const approvalRate = (v.reviewerApprovals + v.reviewerRejections) > 0
      ? v.reviewerApprovals / (v.reviewerApprovals + v.reviewerRejections)
      : 0;
    return { successRate, retryRate, approvalRate, avgDuration: v.avgDuration };
  }

  const ratesA = calcRates(a);
  const ratesB = calcRates(b);

  // Determine winner
  let winner = null;
  let reasoning = [];

  const successDiff = ratesB.successRate - ratesA.successRate;
  const retryDiff = ratesA.retryRate - ratesB.retryRate;  // positive means B has fewer retries
  const approvalDiff = ratesB.approvalRate - ratesA.approvalRate;

  const totalScoreA = ratesA.successRate * 40 + ratesA.approvalRate * 30 + (1 - ratesA.retryRate) * 20 + (ratesA.avgDuration > 0 ? Math.max(0, 10 - ratesA.avgDuration / 10000) : 0);
  const totalScoreB = ratesB.successRate * 40 + ratesB.approvalRate * 30 + (1 - ratesB.retryRate) * 20 + (ratesB.avgDuration > 0 ? Math.max(0, 10 - ratesB.avgDuration / 10000) : 0);

  if (totalScoreB > totalScoreA) {
    winner = experiment.versionB;
    reasoning.push("Version B has higher composite score");
  } else if (totalScoreA > totalScoreB) {
    winner = experiment.versionA;
    reasoning.push("Version A has higher composite score");
  } else {
    winner = "tie";
    reasoning.push("Scores are equal");
  }

  if (successDiff > 0.05) reasoning.push(`Version B success rate is ${(successDiff * 100).toFixed(1)}% higher`);
  if (retryDiff > 0.05) reasoning.push(`Version B retry rate is ${(retryDiff * 100).toFixed(1)}% lower`);
  if (approvalDiff > 0.05) reasoning.push(`Version B approval rate is ${(approvalDiff * 100).toFixed(1)}% higher`);

  return {
    experimentId: experiment.experimentId,
    role: experiment.role,
    versionA: experiment.versionA,
    versionB: experiment.versionB,
    winner,
    reasoning,
    sampleSize: experiment.sampleSize,
    targetSampleSize: experiment.targetSampleSize,
    ratesComparison: {
      versionA: { ...ratesA, totalScore: parseFloat(totalScoreA.toFixed(2)) },
      versionB: { ...ratesB, totalScore: parseFloat(totalScoreB.toFixed(2)) }
    },
    deltas: {
      successRateDelta: parseFloat((successDiff * 100).toFixed(1)),
      retryRateDelta: parseFloat((retryDiff * 100).toFixed(1)),
      approvalRateDelta: parseFloat((approvalDiff * 100).toFixed(1))
    }
  };
}

function getWinner(experimentId) {
  const experiment = getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment ${experimentId} not found`);
  return compareVersions(experiment);
}

// ---- Close Experiment ----

function closeExperiment(experimentId) {
  const experiment = getExperiment(experimentId);
  if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

  experiment.status = "completed";
  experiment.completedAt = new Date().toISOString();

  fs.writeFileSync(getExperimentFilePath(experimentId), JSON.stringify(experiment, null, 2));
  return experiment;
}

module.exports = {
  createExperiment,
  getExperiment,
  listExperiments,
  recordExecution,
  compareVersions,
  getWinner,
  closeExperiment
};