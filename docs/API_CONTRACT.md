# PUBLIC API CONTRACT — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** FROZEN  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. OVERVIEW

This document specifies the official API contract for the PromptAgent framework. It classifies interfaces, entrypoints, outputs, and CLI options to ensure compatibility and stability during the entire v1.x lifecycle.

Developers building tools, extensions, or custom agents for PromptAgent must adhere to this classification to prevent breaking changes.

---

## 2. API CLASSIFICATION STANDARDS

We categorize every interface, command, and module into one of four stability levels:

| Stability Level  | Description                                                                       | Breaking Changes Policy                                              |
| :--------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **PUBLIC**       | Intended for end-users, client integrations, and general pipeline executions.     | Guaranteed stable. No breaking changes permitted in v1.x.            |
| **INTERNAL**     | Intended for orchestrators, sub-engines, and specialized scripts within the repo. | Subject to change only with extreme caution and full validation.     |
| **STABLE**       | Fully production-ready, verified with end-to-end tests, and performance hardened. | Locked. No behavior changes allowed without a major version release. |
| **EXPERIMENTAL** | In development or representing optional helper utilities.                         | May be refactored, consolidated, or removed in minor updates.        |

---

## 3. SUPPORTED ENTRYPOINTS

### 3.1. Production Startup (PUBLIC / STABLE)

- **Path:** `run.js` (Root)
- **Method:** CLI execution
- **Signature:** `node run.js <ProjectName>`
- **Expected Return:**
  - `exit 0` on successful pipeline execution (`ready: true` in JSON response)
  - `exit 1` on validation errors or runner failures.

### 3.2. Programmatic Pipeline Entry (INTERNAL / STABLE)

- **Path:** `workflow/pipeline-runner.js`
- **Method:** `runPipeline(rootDir, projectName)`
- **Returns:** `{ ready: boolean, error?: string, state?: object }`

---

## 4. SUPPORTED CLI COMMANDS (PUBLIC)

The framework exposes standard CLI targets via `package.json` scripts:

```bash
# Executing workflows
npm start -- <ProjectName>                    # Run canonical execution pipeline (Stable)

# Project Lifecycle
npm run init-project                         # Initialize a new agent workspace (Stable)
npm run validate-project                     # Verify current project structure & states (Stable)

# Prompt Self-Evolution
npm run evolve-prompts                       # Execute evolution cycle over existing prompts (Stable)
npm run generate-prompt                      # Generate new prompts using schema definitions (Stable)

# Verification & Formatting
npm run lint                                 # Execute ESLint strict checks (Stable)
npm run lint:fix                             # Automatically fix ESLint violations (Stable)
npm run format                               # Code formatting using Prettier rules (Stable)
npm run format:check                         # Verify code formatting matches standard rules (Stable)

# Testing Suites
npm test                                     # Execute standard Prompt Evolution test runner (Stable)
npm run test:all                             # Run the entire framework test matrix (Stable)
```

---

## 5. SUPPORTED OUTPUTS & SCHEMAS (PUBLIC / STABLE)

All system-generated outputs follow strict structural contracts and schemas. Modifications to these shapes are strictly forbidden to prevent breaking downstream visualization tools and reporting integrations.

### 5.1. Artifact Storage Shape (`projects/<ProjectName>/artifacts/`)

All generated artifacts are accompanied by a manifest. Individual JSON files are verified against standard schema boundaries:

- **Phase Gates:** Verified against `schemas/phase-gates.schema.json`
- **Architectural Decisions (ADR):** Verified against `schemas/adr.schema.json`
- **Task Configurations:** Verified against `schemas/task.schema.json`

### 5.2. State Persistence (`projects/<ProjectName>/agent-state.json`)

The main runtime state maintains status updates, transition paths, and healing logs.

- **Schema:** `schemas/agent-state.schema.json`

### 5.3. Audit Engine Output (`logs/audit.jsonl`)

- **Format:** JSON Lines (`.jsonl`)
- **Contract:** Every line must represent a valid JSON object matching the `schemas/events/*` specifications, appended in strict chronological order.

### 5.4. Metrics Engine Output (`metrics/*.json`)

- **Format:** Key-Value aggregations of run durations, success ratios, prompt evolution histories, and learning efficiency metrics.

---

## 6. SUPPORTED INTERFACES

### 6.1. Event-Driven Messaging Contract (PUBLIC / STABLE)

Engines communicate asynchronously via the global `event-bus.js`. The payload structure of each event is fixed.

| Event Name                    | Schema File                                    | Stability | Emitted By             |
| :---------------------------- | :--------------------------------------------- | :-------- | :--------------------- |
| `agent-executed`              | `agent-executed-v1.0.schema.json`              | STABLE    | `agent-executor`       |
| `agent-transitioned`          | `agent-transitioned-v1.0.schema.json`          | STABLE    | `agent-orchestrator`   |
| `state-updated`               | `state-updated-v1.0.schema.json`               | STABLE    | `state-manager`        |
| `healing-attempted`           | `healing-attempted-v1.0.schema.json`           | STABLE    | `self-healing-engine`  |
| `healing-cycle-completed`     | `healing-cycle-completed-v1.0.schema.json`     | STABLE    | `self-healing-engine`  |
| `lesson-learned`              | `lesson-learned-v1.0.schema.json`              | STABLE    | `learning-loop-engine` |
| `artifact-written`            | `artifact-written-v1.0.schema.json`            | STABLE    | `agent-executor`       |
| `project-phase-bumped`        | `project-phase-bumped-v1.0.schema.json`        | STABLE    | `agent-orchestrator`   |
| `bug-pattern-recorded`        | `bug-pattern-recorded-v1.0.schema.json`        | STABLE    | `self-healing-engine`  |
| `memory-importance-updated`   | `memory-importance-updated-v1.0.schema.json`   | STABLE    | `learning-loop-engine` |
| `reusable-pattern-identified` | `reusable-pattern-identified-v1.0.schema.json` | STABLE    | `learning-loop-engine` |
| `task-status-updated`         | `task-status-updated-v1.0.schema.json`         | STABLE    | `agent-orchestrator`   |

### 6.2. Storage Layer Adapters (INTERNAL / STABLE)

- **`artifact-store.js` Methods:**
  - `writeArtifact(projectDir, file, data)`
  - `readArtifact(projectDir, file)`
  - `listArtifacts(projectDir)`
- **`state-manager.js` Methods:**
  - `loadState(projectDir)`
  - `saveState(projectDir, state)`
  - `setCurrentAgent(projectDir, role)`
  - `setAgentStatus(projectDir, status)`

### 6.3. Evolution and Learning Layer (INTERNAL / EXPERIMENTAL)

- **`prompt-experiment-engine.js` Methods:**
  - Standardized interface for setting up isolated A/B tests between prompt versions. Considered **EXPERIMENTAL** and subject to optimization or unification within the `prompt-evolution-engine` during future non-breaking updates.
- **`global-state-engine.js` / `knowledge-indexer.js` Methods:**
  - Global aggregators and memory graphics builders. Interfaces are **EXPERIMENTAL** and must not be bound directly into the critical path of `npm start` execution.
