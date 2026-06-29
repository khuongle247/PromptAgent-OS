# MODULE CLASSIFICATION — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** FROZEN  
**Date:** June 27, 2026  
**Author:** Chief Software Architect  

---

## 1. CLASSIFICATION SCHEME

To maintain codebase sanity, strict dependency isolation, and structured maintenance strategies, every file and module in PromptAgent is classified under one of seven distinct layers:

1. **CORE:** Crucial runtime files loaded during standard pipeline startup (`npm start`). Breaking any will cause system failure.
2. **INTERNAL:** Supporting logic, schemas, and validators that act as backend utilities for core modules.
3. **PLUGIN:** Standard interfaces, custom hooks, or optional adapter blocks.
4. **CLI:** User-facing scripts invoked directly from terminal shells or npm hooks.
5. **LEGACY:** Backward-compatible components kept to avoid breaking existing project assets, but superseded by newer v2/v3 variants.
6. **ARCHIVED:** Dead or obsolete files removed from the execution path and safely isolated into the `archive/` directory.
7. **EXPERIMENTAL:** Standalone features or engines under active research, not bound into the automated critical path.

---

## 2. WORKFLOW ENGINE MODULES (`workflow/`)

| Module | Classification | Rationale |
| :--- | :--- | :--- |
| `pipeline-runner.js` | **CORE** | The centralized driver initialized directly by `run.js` to dispatch pre-flight checks and initiate execution. |
| `agent-orchestrator.js` | **CORE** | Main execution driver that manages step transitions (planner -> architect -> coder -> reviewer -> debugger). |
| `agent-executor.js` | **CORE** | Low-level LLM dispatcher. Orchestrates prompt compiling, token processing, output schema verification, and file persistence. |
| `agent-runner.js` | **CORE** | Handles pre-flight role checks and builds execution context bundles. Required by core execution chains. |
| `phase-controller.js` | **CORE** | Maintains state machine config and controls project flow transitions across phases. |
| `state-manager.js` | **CORE** | Directly controls reading/writing runtime states (`agent-state.json`) and triggers historical change events. |
| `artifact-store.js` | **CORE** | Handles file storage, retrieval, and manifest updates for agent outputs. |
| `transition-engine.js` | **CORE** | Rule engine deciding the routing paths of agents after execution feedback. |
| `learning-loop-engine.js`| **CORE** | Automatically parses task failures and successes to extract memories, lessons, and reusable patterns. |
| `self-healing-engine.js` | **CORE** | Detects runtime faults and coordinates automated coder/reviewer feedback-fix loops. |
| `event-bus.js` | **CORE** | Pub-sub events broker acting as the critical messaging backbone. |
| `event-schema-registry.js`| **CORE** | Validates structure of message payloads before publication on the event bus. |
| `event-validation-middleware.js`| **CORE** | Intercepts all event bus publications to enforce event type matching. |
| `audit-engine.js` | **CORE** | Wildcard subscriber executing passive logging to preserve the absolute audit trail (`logs/audit.jsonl`). |
| `metrics-engine.js` | **CORE** | Consumes telemetry events and outputs execution analytics to `metrics/*.json`. |
| `framework-health.js` | **CORE** | Scores framework health and flags architectural anomalies or performance decay. |
| `prompt-evolution-engine.js`| **CORE** | Handles version compilation, weakness diagnostics, and prompt generation cycles. |
| `prompt-version-manager.js` | **CORE** | Manages prompt directory directories and handles stable version promotions. |
| `prompt-analyzer.js` | **CORE** | Inspects audit trails and metrics files to pinpoint prompt vulnerabilities. |
| `prompt-evolution-scheduler.js`| **CORE** | Periodically triggers automatic self-improvement cycles in background. |
| `knowledge-indexer.js` | **CORE** | Reads memory graphs and builds context nodes for planner agents. |
| `memory-retrieval-engine.js`| **CORE** | Coordinates query similarity mapping against the vector or flat memory stores. |
| `global-state-engine.js` | **EXPERIMENTAL**| Standalone global aggregator. Not automatically loaded, lacks dependencies from execution core. |
| `state-recovery-engine.js`| **EXPERIMENTAL / CLI** | Utility to recover damaged state files. Only run manually; not part of autonomous runtime. |
| `prompt-experiment-engine.js`| **EXPERIMENTAL** | Lightweight standalone variant for localized A/B testing, decoupled from main evolutionary loops. |
| `strategic-planner.js` | **EXPERIMENTAL / CLI** | Standalone tool executing macro planning. Only invoked manually; not wired to automated loop. |
| `autonomous-task-generator.js`| **EXPERIMENTAL / CLI** | Standalone routine to generate tasks from strategic plans. |

---

## 3. ADAPTER MODULES (`adapters/`)

| Module | Classification | Rationale |
| :--- | :--- | :--- |
| `legacy-adapter.js` | **CORE / LEGACY** | Maintains backward compatibility of artifact schemas. Required by `agent-executor.js` to parse old layouts, but frozen against new feature additions. |

---

## 4. SCRIPTS (`scripts/`)

| Module | Classification | Rationale |
| :--- | :--- | :--- |
| `run.js` (root) | **CLI / CORE** | The canonical single entrypoint for the production application. Maps incoming parameters to `pipeline-runner.js`. |
| `scripts/event-integration.js`| **INTERNAL** | Orchestrates registration of core observability microservices on event bus. |
| `scripts/validation/validation-utils.js`| **INTERNAL** | Core stateless functional utilities shared between multiple scripts and runtime checkers. |
| `scripts/init-project-v2.js`| **CLI** | Stable modern CLI routine to initiate fresh workspaces. Mapped to `npm run init-project`. |
| `scripts/generate-prompt-v3.js`| **CLI** | Advanced prompt compilation CLI engine. Mapped to `npm run generate-prompt`. |
| `scripts/validate-project-v2.js`| **CLI** | Full workspace structural validation program. Mapped to `npm run validate-project`. |
| `scripts/run-prompt-evolution.js`| **CLI** | Command line wrapper to run a localized self-evolution cycle. Mapped to `npm run evolve-prompts`. |
| `scripts/phase9-audit.js` | **CLI / INTERNAL**| Validation auditing scripts verifying Phase 9 deliverables. |
| `scripts/phase9-final-verify.js`| **CLI / INTERNAL**| Strict pre-release validation and test orchestration script. |
| `scripts/create-task.js` | **CLI** | Component of the task-management CLI tools. |
| `scripts/complete-task.js` | **CLI** | Component of the task-management CLI tools. |
| `scripts/select-task.js` | **CLI** | Component of the task-management CLI tools. |
| `scripts/rollback-task.js` | **CLI** | Component of the task-management CLI tools. |
| `scripts/milestone-manager.js`| **CLI** | Milestone tracking automation tool. |
| `scripts/memory-manager-v2.js`| **CLI** | Memory inspection and vector query utility (v2). |
| `scripts/task-engine-v3.js` | **CLI** | Advanced processing logic engine (v3). |
| `scripts/task-utils-v2.js` | **INTERNAL** | Core task metrics helper functions. Required by active workflow modules. |
| `scripts/init-project.js` | **LEGACY** | Superseded by `init-project-v2.js`. Kept solely for fallback compatibility. |
| `scripts/generate-prompt.js` | **LEGACY** | Superseded by `generate-prompt-v3.js`. Kept solely for fallback compatibility. |
| `scripts/task-engine.js` | **LEGACY** | Superseded by `task-engine-v3.js`. Kept solely for fallback compatibility. |
| `scripts/task-utils.js` | **LEGACY** | Superseded by `task-utils-v2.js`. Kept solely for fallback compatibility. |
| `scripts/memory-manager.js` | **LEGACY** | Superseded by `memory-manager-v2.js`. Kept solely for fallback compatibility. |
| `scripts/validate-project.js`| **LEGACY** | Superseded by `validate-project-v2.js`. Kept solely for fallback compatibility. |
| `scripts/validate-planner-output.js`| **LEGACY** | Replaced by unified-validation-pipeline checks. |
| `scripts/import-planner-output.js`| **LEGACY** | Replaced by unified-validation-pipeline checks. |

---

## 5. ARCHIVED MODULES (`archive/`)

The following files have been verified as dead (100% unused with no active `require` or execution paths). They have been isolated and moved out of active folders to ensure runtime safety:

- `scripts/append-memory.js` (Archived: Memory is automated via `learning-loop-engine.js`)
- `scripts/generate-planner-prompt-v2.js` (Archived: Obsolete compilation step)
- `scripts/test-task-engine.js` (Archived: Redundant old test helper)
- `agents/agent-state-machine.js` (Archived: Redundant state configuration; state tracking managed dynamically by `state-manager.js`)
