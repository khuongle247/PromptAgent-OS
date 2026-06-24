const fs = require("fs");
const path = require("path");

const promptEvolution = require("./prompt-evolution-engine");
const frameworkHealth = require("./framework-health");
const metricsEngine = require("./metrics-engine");

const DEFAULT_CONFIG = {
  enabled: true,
  intervalHours: 24,
  healthThreshold: 80,
  retryRateThreshold: 0.2,
  failureRateThreshold: 0.1,
  autoPromote: false
};

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "config", "prompt-evolution.json");

let intervalId = null;
let initialized = false;
let lastEvaluationAt = null;
let lastRunAt = null;
let lastRunReason = null;
let configCache = null;

function loadConfig() {
  if (configCache) return configCache;
  const configPath = process.env.PROMPT_EVOLUTION_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  let config = { ...DEFAULT_CONFIG };

  if (fs.existsSync(configPath)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(configPath, "utf8"));
      config = { ...config, ...loaded };
    } catch (err) {
      console.warn(`[PromptEvolutionScheduler] Failed to parse config at ${configPath}: ${err.message}`);
    }
  }

  if (typeof config.intervalSeconds === "number" && config.intervalSeconds > 0) {
    config.intervalMs = Math.round(config.intervalSeconds * 1000);
  } else {
    config.intervalMs = Math.round((config.intervalHours || DEFAULT_CONFIG.intervalHours) * 3600 * 1000);
  }

  config.enabled = config.enabled !== false;
  config.healthThreshold = Number(config.healthThreshold) || DEFAULT_CONFIG.healthThreshold;
  config.retryRateThreshold = Number(config.retryRateThreshold) || DEFAULT_CONFIG.retryRateThreshold;
  config.failureRateThreshold = Number(config.failureRateThreshold) || DEFAULT_CONFIG.failureRateThreshold;
  config.autoPromote = config.autoPromote === true;

  configCache = config;
  return config;
}

function getHealthAndMetrics() {
  const healthReport = frameworkHealth.generateHealthReport();
  const agentMetrics = metricsEngine.getAgentMetrics();
  return { healthReport, agentMetrics };
}

function shouldRunEvolution(config, healthReport, agentMetrics, intervalTriggered = false) {
  if (intervalTriggered) {
    lastRunReason = "scheduled-interval";
    return true;
  }

  const healthTrigger = healthReport.score < config.healthThreshold;
  const retryTrigger = agentMetrics.totalExecutions > 0 && (agentMetrics.retryCount / agentMetrics.totalExecutions) > config.retryRateThreshold;
  const failureTrigger = agentMetrics.totalExecutions > 0 && (agentMetrics.failedExecutions / agentMetrics.totalExecutions) > config.failureRateThreshold;

  if (healthTrigger) {
    lastRunReason = "health-score-below-threshold";
    return true;
  }

  if (retryTrigger) {
    lastRunReason = "retry-rate-above-threshold";
    return true;
  }

  if (failureTrigger) {
    lastRunReason = "failure-rate-above-threshold";
    return true;
  }

  lastRunReason = "no-trigger";
  return false;
}

function summarizeEvaluation(config, healthReport, agentMetrics, intervalTriggered, didRun) {
  const info = [];
  info.push(`[PromptEvolutionScheduler] Health score: ${healthReport.score} (threshold ${config.healthThreshold})`);
  info.push(`[PromptEvolutionScheduler] Retry rate: ${agentMetrics.totalExecutions > 0 ? (agentMetrics.retryCount / agentMetrics.totalExecutions).toFixed(3) : 0} (threshold ${config.retryRateThreshold})`);
  info.push(`[PromptEvolutionScheduler] Failure rate: ${agentMetrics.totalExecutions > 0 ? (agentMetrics.failedExecutions / agentMetrics.totalExecutions).toFixed(3) : 0} (threshold ${config.failureRateThreshold})`);
  info.push(`[PromptEvolutionScheduler] Trigger reason: ${lastRunReason}${intervalTriggered ? " (interval elapsed)" : ""}`);
  info.push(`[PromptEvolutionScheduler] Evolution run executed: ${didRun}`);
  return info.join("\n");
}

function runSchedulerOnce(options = {}) {
  const config = loadConfig();
  if (!config.enabled) {
    console.log("[PromptEvolutionScheduler] Scheduler is disabled by config.");
    return false;
  }

  const { intervalTriggered = false, force = false } = options;
  const { healthReport, agentMetrics } = getHealthAndMetrics();
  lastEvaluationAt = new Date();

  const shouldRun = force || shouldRunEvolution(config, healthReport, agentMetrics, intervalTriggered);
  if (!shouldRun) {
    console.log(summarizeEvaluation(config, healthReport, agentMetrics, intervalTriggered, false));
    return false;
  }

  try {
    const result = promptEvolution.runEvolutionCycle();
    lastRunAt = new Date();
    console.log(summarizeEvaluation(config, healthReport, agentMetrics, intervalTriggered, true));
    console.log(`[PromptEvolutionScheduler] Evolution result: autoPromote=${config.autoPromote} canAutoPromote=${result.canAutoPromote?.canPromote}`);
    return true;
  } catch (err) {
    console.error("[PromptEvolutionScheduler] Evolution cycle failed:", err && err.message ? err.message : err);
    return false;
  }
}

function startScheduler() {
  if (initialized) return;

  const config = loadConfig();
  if (!config.enabled) {
    console.log("[PromptEvolutionScheduler] Scheduler is disabled by configuration.");
    initialized = true;
    return;
  }

  if (config.intervalMs <= 0) {
    console.warn("[PromptEvolutionScheduler] Invalid interval configured; scheduler will not start.");
    initialized = true;
    return;
  }

  intervalId = setInterval(() => {
    runSchedulerOnce({ intervalTriggered: true });
  }, config.intervalMs);

  console.log(`[PromptEvolutionScheduler] Scheduler started with interval ${config.intervalMs}ms.`);
  initialized = true;

  runSchedulerOnce({ intervalTriggered: false });
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  initialized = false;
}

function isRunning() {
  return initialized;
}

function getLastRunAt() {
  return lastRunAt;
}

module.exports = {
  startScheduler,
  stopScheduler,
  isRunning,
  getLastRunAt,
  runSchedulerOnce,
  loadConfig
};
