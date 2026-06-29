# ARCHITECTURE LOCK — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** FROZEN  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. ARCHITECTURE FREEZE STATEMENT

This document establishes an **immutable architecture lock** for the PromptAgent framework throughout the v1.x lifecycle. No structural modifications, workflow redesigns, core behavior modifications, module renamings, or file reorganizations may be introduced without formal deprecation and semver-bump processes.

All core modules are officially frozen to protect runtime stability, deterministic validation paths, and verified event-driven instrumentation.

---

## 2. CANONICAL SINGLE ENTRYPOINT

The canonical, unified entrypoint for executing any workflow under the PromptAgent framework is:

```
run.js
```

### Usage

```bash
node run.js <ProjectName>
```

Or via npm:

```bash
npm start -- <ProjectName>
```

No other script or file within `workflow/` or `scripts/` is authorized for direct production execution. `run.js` encapsulates the environment loading, parameters extraction, safety verification, and hands off execution to the `pipeline-runner.js`.

---

## 3. CANONICAL STARTUP SEQUENCE & RUNTIME FLOW

The full runtime initialization flow is divided into three sequential phases.

### Phase A: Core Initialization (Synchronous Loading)

1. **`run.js`** is executed with `ProjectName`.
2. **`run.js`** invokes `runPipeline(process.cwd(), projectName)` from `workflow/pipeline-runner.js`.
3. **`pipeline-runner.js`** synchronously loads dependency engines:
   - `unified-validation-pipeline.js` (Pre-flight safety layer)
   - `phase-controller.js` (Metadata and routing configuration)
   - `agent-runner.js` (Context construction and agent execution preparation)
   - `scripts/event-integration.js` (Subscribes observability engines to Event Bus)
   - `workflow/event-bus.js` (Core communication channel)

### Phase B: Observability & Scheduler Startup

4. **`event-integration.js`** initializes global engines and hooks them to the `event-bus.js`:
   - `AuditEngine.initialize(eventBus)` (Subscribed to `*` to record all event logs to `logs/audit.jsonl`)
   - `MetricsEngine.initialize(eventBus)` (Subscribed to performance and execution events)
   - `PromptEvolutionScheduler.startScheduler()` (Starts the automated self-improvement background routine)
5. **`event-bus.js`** loads schemas via `event-schema-registry.js` and applies safety validations via `event-validation-middleware.js` to every published event.

### Phase C: Pre-Flight Validation & Loop Dispatch

6. **`pipeline-runner.js`** invokes `runUnifiedValidationPipeline`:
   - Verifies project directory and workspace configuration
   - Validates phase configurations against schema rules
   - Ensures existence and compliance of base agent artifacts
7. **`pipeline-runner.js`** queries the `phase-controller.js` to determine current workflow states and dispatches the execution engine.

```
┌────────────────────────────────────────────────────────┐
│                        run.js                          │
│          (Canonical Deterministic Entrypoint)          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                workflow/pipeline-runner.js             │
│            (Core Pipeline Router & Controller)          │
└──────────┬─────────────────────────────┬───────────────┘
           │                             │
           ▼                             ▼
┌─────────────────────┐       ┌──────────────────────────┐
│  unified-validation │       │    event-integration     │
│  -pipeline.js       │       │    (Observability Sub)   │
└─────────────────────┘       └──────────┬───────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │   audit-engine.js   │ │  metrics-engine.js  │ │  prompt-evolution-  │
      │   (Wildcard `*` Sub)│ │ (Targeted Event Sub)│ │  scheduler.js       │
      └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 4. SECONDARY FLOW: AGENT ORCHESTRATION & AGENT EXECUTION

During the execution phase, `agent-orchestrator.js` drives the multi-agent loop:

```
agent-orchestrator.orchestrate()
  └── runLoop(rootDir, projectName)
       └── ensureState(projectDir) -> state-manager.js
       └── runStep(rootDir, projectDir, role)
            ├── executeAgent(rootDir, projectDir, role) -> agent-executor.js
            │    ├── loadProjectBundle() -> agent-runner (buildAgentContext)
            │    ├── loadPrompt() -> prompt-version-manager
            │    ├── retrieveMemories() -> memory-retrieval-engine
            │    ├── execute LLM or buildMockOutput()
            │    ├── coerceOutput() -> legacy-adapter
            │    ├── validateOutput() -> JSON Schema validation
            │    ├── writeArtifact() -> artifact-store
            │    └── eventBus.publish() -> emits "agent-executed", "artifact-written"
            │
            ├── getStatus() -> state-manager
            ├── evaluateTransition() -> transition-engine
            ├── setAgentStatus() -> state-manager -> emits "state-updated" event
            ├── writeArtifact() -> artifact-store
            ├── analyzeExecutionResults() -> learning-loop-engine
            │    ├── loadMemory() -> task-utils-v2
            │    ├── readArtifact() -> artifact-store
            │    └── eventBus.publish() -> emits "lesson-learned"
            ├── eventBus.publish() -> emits "agent-transitioned"
            └── eventBus.publish() -> emits "task-status-updated"
```

---

## 5. RUNTIME CONTRACT

To maintain the production-ready state (95/100 readiness score), all modules must satisfy the following **Runtime Contract**:

1. **Deterministic Error Handling:** Every async operation must catch errors internally and escalate them through proper event channels or standard process exit status rather than unhandled rejections.
2. **Zero-Side-Effect Imports:** Requiring any module under `workflow/` or `scripts/` must be pure and cause zero global state modifications or background operations during import-time. Side effects are permitted only inside explicit function calls (e.g., `initialize()`, `start()`).
3. **Strict Event Schema Adherence:** All events published on the `event-bus` must match the pre-defined schemas in `schemas/events/`. Any message violating its schema will be blocked by `event-validation-middleware` to preserve data integrity.
4. **Isolated Memory Contexts:** No module may read or write directly to memory files without routing through `memory-retrieval-engine.js` or `learning-loop-engine.js`.
5. **Artifact Manifest Integrity:** All writes to output directories must log entry updates through `artifact-store.js` to ensure the integrity of the project artifact registry.

---

## 6. DEPENDENCY BOUNDARIES

To prevent circular dependencies and maintain modularity, dependency boundaries are locked as follows:

- **Observability Layer (`audit-engine`, `metrics-engine`)** is strictly passive. They may subscribe to the `event-bus`, but they must never call any active workflow or execution engine.
- **Workflow Core (`agent-orchestrator`, `agent-executor`)** acts as the dispatcher. They may call storage layer adapters and emit events, but they must remain entirely agnostic of the consumers subscribing to those events.
- **Adapters (`legacy-adapter`)** must be completely standalone with zero dependencies on other workflow scripts.
- **Validation Utilities (`scripts/validation/validation-utils.js`)** must remain a stateless, pure functional utility layer.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPPER BOUNDARY: RUNTIME                         │
│               pipeline-runner / agent-orchestrator                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MIDDLE BOUNDARY: SERVICES                       │
│    agent-executor / learning-loop-engine / prompt-evolution-engine      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        LOWER BOUNDARY: STORAGE & UTIL                  │
│       state-manager / artifact-store / validation-utils / database      │
└────────────────────────────────────────────────────────────────────────┘
```

Any modification that bypasses these boundaries or introduces circular require paths is strictly forbidden.
