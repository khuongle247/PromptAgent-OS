# CHANGELOG

All notable changes to PromptAgent are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta] — 2026-06-27

### Added
- **Single entrypoint architecture:** `run.js` is now the canonical entrypoint (`npm start`).
- **Production README:** Comprehensive documentation covering installation, architecture, development, and debugging.
- **ESLint + Prettier configuration:** Code quality tooling with lint and format npm scripts.
- **GitHub Actions CI:** Automated pipeline for lint, format check, and all test suites.
- **CHANGELOG.md:** Change tracking per semantic versioning.
- **CONTRIBUTING.md:** Developer guide for contributing to the project.
- **Release checklist:** `docs/RELEASE_CHECKLIST.md` for production release validation.
- **Shared utility functions:** `readJsonSafe` and `readTextSafe` added to `validation-utils.js` and exported.
- **`npm run test:all`:** Script that runs all 7 test suites sequentially.
- **Semantic versioning:** `package.json` version set to `1.0.0-beta`.

### Changed
- **Dead file archiving:** 4 confirmed unused files moved to `archive/`: `append-memory.js`, `generate-planner-prompt-v2.js`, `test-task-engine.js`, `agent-state-machine.js`.
- **Package.json script alignment:** `init-project` points to `init-project-v2.js`; `generate-prompt` points to `generate-prompt-v3.js`.
- **Shared utility refactor:** `strategic-planner.js`, `autonomous-task-generator.js`, and `global-state-engine.js` now import `readJsonSafe`/`readTextSafe` from `validation-utils.js` instead of maintaining local copies.
- **Event validation:** Fixed missing schema warning for test events.

### Fixed
- **`readJsonSafe is not a function` startup error:** Resolved by exporting the function from `validation-utils.js` and updating dependent modules.
- **Startup stability:** Pipeline-runner now gracefully reports missing project files instead of crashing.

### Removed
- **Dead code (archived):** `scripts/append-memory.js`, `scripts/generate-planner-prompt-v2.js`, `scripts/test-task-engine.js`, `agents/agent-state-machine.js`.

---

## [0.9.0] — 2026-06-25

### Added
- **Architecture freeze report:** `audit/ARCHITECTURE-FREEZE.md` — complete runtime trace with 59-step execution flow.
- **Runtime verification report:** `audit/RUNTIME-VERIFICATION-REPORT.md` — require() chain verification across all files.
- **Safe cleanup report:** `audit/SAFE-CLEANUP-REPORT.md` — conservative cleanup plan.
- **Test verification report:** `audit/TEST-VERIFICATION-REPORT.md` — 153+ tests passing across 7 test suites.

### Changed
- **Event bus hardening:** Schema registry loads 12 event types; validation middleware quarantines invalid events.
- **Observability initialization:** AuditEngine + MetricsEngine auto-subscribe on pipeline startup.

---

## [0.8.0] — 2026-06-20

### Added
- **Phase 10 — Scheduler automation:** Prompt evolution scheduler with configurable intervals and health-based triggers.
- **Phase 95 — Automation tests:** End-to-end automation validation for prompt evolution pipeline.
- **Phase 10 scheduler tests:** Scheduler integration test suite.

### Changed
- **Prompt evolution engine:** Auto-promotion evaluation with success rate, retry rate, and rating thresholds.
- **Experiment engine:** A/B testing with winner determination and composite scoring.

---

## [0.7.0] — 2026-06-15

### Added
- **Phase 9 — Prompt self-improving system:**
  - `prompt-version-manager.js`: Versioned prompt storage with promotion workflow.
  - `prompt-analyzer.js`: Weakness detection from audit logs.
  - `prompt-evolution-engine.js`: Automated prompt improvement generation.
  - `prompt-experiment-engine.js`: A/B testing between prompt versions.
- **Phase 9 tests:** 70 tests covering all evolution components.

---

## [0.6.0] — 2026-06-10

### Added
- **Phase 8 — Framework health engine:**
  - `framework-health.js`: Health scoring, bottleneck detection, risk analysis, recommendations.
  - Health report persistence to `health/framework-status.json`.
- **Phase 8 tests:** 51 tests covering health scoring and recommendations.

---

## [0.5.0] — 2026-06-05

### Added
- **Phase 7 — Observability system:**
  - `audit-engine.js`: Wildcard event logging to `logs/audit.jsonl`.
  - `metrics-engine.js`: Agent, task, and learning metric tracking.
  - `event-integration.js`: Engine initialization bootstrap.
  - Event bus with schema validation middleware.
- **Phase 7 integration tests:** 28 tests covering engine initialization and event capture.

---

## [0.4.0] — 2026-06-01

### Added
- **State recovery engine:** `workflow/state-recovery-engine.js` for execution resumption.
- **Autonomous task generator:** `workflow/autonomous-task-generator.js` for signal-based task creation.
- **Strategic planner:** `workflow/strategic-planner.js` with goal decomposition and priority scoring.
- **Knowledge indexer:** `workflow/knowledge-indexer.js` for knowledge graph construction.

---

## [0.3.0] — 2026-05-25

### Added
- **Self-healing engine:** `workflow/self-healing-engine.js` with automatic coder/reviewer retry cycles.
- **Learning loop engine:** `workflow/learning-loop-engine.js` for execution result analysis.
- **Memory retrieval engine:** `workflow/memory-retrieval-engine.js` for relevance-based memory queries.
- **Event-driven architecture:** Event bus with typed events for agent transitions, artifacts, healing cycles, and learning.

---

## [0.2.0] — 2026-05-20

### Added
- **Agent execution loop:** Planner → Architect → Coder → Reviewer → Debugger workflow.
- **Agent executor:** LLM execution with prompt loading, schema validation, and artifact storage.
- **State manager:** Per-project agent state with history tracking.
- **Artifact store:** Output artifact persistence with manifest.
- **Transition engine:** Agent routing with retry/advance/finish logic.
- **Validation pipeline:** Project workspace, phase gate, and agent artifact validation.

---

## [0.1.0] — 2026-05-15

### Added
- Initial project scaffolding.
- Prompt templates (planner, architect, coder, reviewer, debugger).
- JSON schemas for agent outputs and handoff contracts.
- Project initialization and generation CLI scripts.