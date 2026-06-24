/**
 * event-integration.js
 * Phase 7: Framework startup initialization for AuditEngine + MetricsEngine.
 *
 * Usage:
 *   const { initializeEngines } = require("./event-integration");
 *   initializeEngines(eventBus);
 *
 * This module is additive only. It does not modify existing EventBus,
 * Event Validation Layer, or any business logic.
 */

const AuditEngine = require("../workflow/audit-engine");
const MetricsEngine = require("../workflow/metrics-engine");

let enginesInitialized = false;

/**
 * Initialize all Phase 7 engines.
 * @param {Object} eventBus - EventBus singleton instance
 */
function initializeEngines(eventBus) {
  if (enginesInitialized) {
    return;
  }

  AuditEngine.initialize(eventBus);
  MetricsEngine.initialize(eventBus);

  enginesInitialized = true;
  console.log("[EventIntegration] AuditEngine + MetricsEngine initialized.");
}

/**
 * Check whether engines have been initialized.
 */
function areEnginesInitialized() {
  return enginesInitialized;
}

/**
 * Reset initialization state (for test isolation).
 */
function reset() {
  enginesInitialized = false;
}

module.exports = {
  initializeEngines,
  areEnginesInitialized,
  reset
};