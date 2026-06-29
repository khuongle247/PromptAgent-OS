# ARCHITECTURE SIMPLIFIED — Architecture Refactor Report

**Generated:** 2026-06-25  
**Scope:** Full repository audit  
**Goal:** Reduce complexity, remove duplications, identify dead code

---

## 1. RUNTIME DEPENDENCY GRAPH

```
workflow/strategic-planner.js
  ├── artifact-store (readArtifact, listArtifacts)
  ├── state-manager (loadState)
  ├── memory-retrieval-engine (retrieveMemories)
  └── knowledge-indexer (buildKnowledgeGraph)

workflow/autonomous-task-generator.js
  ├── agent-executor (executeAgent)
  ├── artifact-store (listArtifacts)
  ├── state-manager (setCurrentAgent, setAgentStatus, loadState)
  ├── learning-loop-engine (analyzeExecutionResults)
  └── memory-retrieval-engine (retrieveMemories)

workflow/agent-runner.js
  ├── phase-controller (getRoleConfig, getCurrentWorkflowState)
  └── memory-retrieval-engine (retrieveMemories)

workflow/agent-executor.js
  ├── agent-runner (buildAgentContext)
  ├── artifact-store (writeArtifact)
  ├── legacy-adapter (adaptLegacyArtifact)
  ├── memory-retrieval-engine (retrieveMemories)
  ├── prompt-version-manager (getActiveVersion)
  └── event-bus (publish)

workflow/agent-orchestrator.js
  ├── agent-executor (executeAgent)
  ├── artifact-store (writeArtifact, readArtifact, listArtifacts)
  ├── state-manager (loadState, saveState, setCurrentAgent, setAgentStatus, bumpPhase, getStatus)
  ├── transition-engine (evaluateTransition, getNextAgent)
  ├── learning-loop-engine (analyzeExecutionResults)
  └── event-bus (publish)

workflow/self-healing-engine.js
  ├── agent-executor (executeAgent)
  ├── artifact-store (readArtifact, listArtifacts)
  ├── state-manager (loadState, setAgentStatus, incrementRetry, getStatus)
  ├── transition-engine (getNextAgent)
  ├── learning-loop-engine (analyzeExecutionResults)
  └── event-bus (publish)

workflow/pipeline-runner.js
  ├── unified-validation-pipeline (runUnifiedValidationPipeline)
  ├── phase-controller (getCurrentWorkflowState, getNextRole)
  ├── agent-runner (runAgent)
  ├── event-integration (initializeEngines)
  └── event-bus

workflow/prompt-evolution-engine.js
  ├── prompt-analyzer (analyzePrompts, getWeaknessReport)
  └── prompt-version-manager (getActiveVersion, createCandidate)

workflow/prompt-evolution-scheduler.js
  ├── prompt-evolution-engine (runEvolutionCycle)
  ├── framework-health (generateHealthReport)
  └── metrics-engine (getAgentMetrics)
```

---

## 2. WORKFLOW DEPENDENCY GRAPH

```
                ┌────────────────────────────────────────┐
                │          pipeline-runner.js             │
                │  (entry point via package.json "start") │
                └──────────┬─────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────────┐ ┌─────────┐ ┌──────────────────┐
    │  phase-controller│ │agent-   │ │unified-validation│
    │                 │ │runner   │ │-pipeline         │
    └─────────────────┘ └────┬────┘ └──────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
    │agent-orches- │ │agent-executor│ │strategic-      │
    │trator        │ │              │ │planner          │
    └───────┬──────┘ └──────┬───────┘ └────────────────┘
            │               │
            ▼               ▼
    ┌──────────────┐ ┌──────────────────────┐
    │self-healing- │ │autonomous-task-      │
    │engine        │ │generator              │
    └───────┬──────┘ └──────────────────────┘
            │
            ▼
    ┌──────────────────┐
    │learning-loop-    │
    │engine            │
    └──────────────────┘
```

---

## 3. EVENT DEPENDENCY GRAPH

```
Event Bus ──▶ subscribers:
  │
  ├─ "agent-executed" ──────────▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "agent-transitioned" ──────▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "state-updated" ───────────▶ audit-engine.js
  │
  ├─ "artifact-written" ────────▶ audit-engine.js
  │
  ├─ "healing-attempted" ──────▶ audit-engine.js
  │
  ├─ "healing-cycle-completed" -▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "lesson-learned" ──────────▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "memory-importance-updated" ▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "reusable-pattern-ident" ──▶ metrics-engine.js
  │                                audit-engine.js
  │
  ├─ "bug-pattern-recorded" ────▶ audit-engine.js
  │
  ├─ "task-status-updated" ─────▶ audit-engine.js
  │
  └─ "project-phase-bumped" ────▶ audit-engine.js

Key observation: audit-engine.js subscribes to ALL events via "*" wildcard.
metrics-engine.js subscribes to 6 event types individually.
```

---

## 4. PROMPT EVOLUTION DEPENDENCY GRAPH

```
prompt-evolution-scheduler.js
  │ reads config/prompt-evolution.json
  │
  ├── calls: framework-health.generateHealthReport()
  │           └── reads metrics/*.json, logs/audit.jsonl
  │
  ├── calls: metrics-engine.getAgentMetrics()
  │
  └── calls: prompt-evolution-engine.runEvolutionCycle()
               │
               ├── calls: prompt-analyzer.analyzePrompts()
               │           └── reads logs/audit.jsonl
               │               reads metrics/*.json
               │
               └── calls: prompt-version-manager
                           ├── getActiveVersion(role)
                           ├── createCandidate(role, content, parentVersion)
                           └── AGENT_ROLES (planner, architect, coder, reviewer, debugger)
                           
prompt-experiment-engine.js
  └── independent module
      └── persists to experiments/*.json
```

---

## 5. FILE CLASSIFICATION

### A. CORE RUNTIME (7 files)
These are the essential execution engine that processes agents.

| File | Purpose | Callers | Dependents | Can remove? |
|------|---------|---------|------------|-------------|
| `workflow/agent-orchestrator.js` | Orchestrates agent loop (planner→architect→coder→reviewer→debugger) | pipeline-runner, CLI | agent-executor, state-manager, artifact-store, transition-engine, learning-loop-engine, event-bus | NO — main workflow engine |
| `workflow/agent-executor.js` | Executes a single agent: loads prompt, builds context, runs LLM/mock, validates output | agent-orchestrator, self-healing-engine, autonomous-task-generator | agent-runner, artifact-store, prompt-version-manager, event-bus | NO — core execution |
| `workflow/state-manager.js` | Persists agent state (agent-state.json) with history tracking | agent-orchestrator, self-healing-engine, autonomous-task-generator, strategic-planner | event-bus | NO — state persistence |
| `workflow/artifact-store.js` | Manages agent output artifacts with manifest | agent-orchestrator, agent-executor, self-healing-engine, strategic-planner, autonomous-task-generator, knowledge-indexer, learning-loop-engine | none | NO — artifact persistence |
| `workflow/transition-engine.js` | Decides next agent based on execution results | agent-orchestrator | none | NO — workflow transitions |
| `workflow/agent-runner.js` | Builds agent context and validates output | pipeline-runner, agent-executor | phase-controller, memory-retrieval-engine | NO — context builder |
| `workflow/unified-validation-pipeline.js` | Validates project before agent execution | pipeline-runner | (validators) | NO — pre-flight validation |

### B. REQUIRED INFRASTRUCTURE (8 files)
Supporting infrastructure needed for core runtime.

| File | Purpose | Callers | Dependents | Can remove? |
|------|---------|---------|------------|-------------|
| `workflow/phase-controller.js` | Role config and workflow state | pipeline-runner, agent-runner | none | NO — routing |
| `workflow/pipeline-runner.js` | Entry point, initializes engines, runs pipeline | package.json, CLI | unified-validation-pipeline, phase-controller, agent-runner, event-integration, event-bus | NO — main entry |
| `adapters/legacy-adapter.js` | Legacy artifact format adaptation | agent-executor | none | NO — backward compat |
| `agents/agent-context.js` | Agent context utilities | agent-executor (indirect) | none | Likely NO — check refs |
| `agents/agent-state-machine.js` | Agent state machine model | agent-orchestrator (indirect) | none | **Check: may be unused, overlaps state-manager** |
| `scripts/validation/validation-utils.js` | Shared JSON/validation utilities | ~10 files across workflow | none | NO — shared utility |

### C. EVOLUTION SYSTEM (5 files)
Prompt self-improvement pipeline.

| File | Purpose | Callers | Dependents | Can remove? |
|------|---------|---------|------------|-------------|
| `workflow/prompt-evolution-engine.js` | Orchestrates prompt evolution cycle | prompt-evolution-scheduler, run-prompt-evolution.js | prompt-analyzer, prompt-version-manager | NO — core evolution |
| `workflow/prompt-version-manager.js` | Versioned prompt storage + promotion | agent-executor, prompt-evolution-engine | none | NO — versioning |
| `workflow/prompt-analyzer.js` | Analyzes audit logs for weaknesses | prompt-evolution-engine | none | NO — analysis |
| `workflow/prompt-experiment-engine.js` | A/B testing between versions | (standalone) | none | **Can consolidate into evolution engine** |
| `workflow/prompt-evolution-scheduler.js` | Scheduled auto-evolution | (standalone) | prompt-evolution-engine, framework-health, metrics-engine | NO — automation |

### D. LEARNING SYSTEM (4 files)
Memory and knowledge layer.

| File | Purpose | Callers | Dependents | Can remove? |
|------|---------|---------|------------|-------------|
| `workflow/memory-retrieval-engine.js` | Retrieves relevant memories by query | agent-executor, agent-runner, strategic-planner, autonomous-task-generator | none | NO — memory context |
| `workflow/knowledge-indexer.js` | Builds knowledge graph from memory | strategic-planner | artifact-store | **Overlaps with memory-retrieval-engine** |
| `workflow/learning-loop-engine.js` | Analyzes results, extracts lessons, emits events | agent-orchestrator, self-healing-engine, autonomous-task-generator | artifact-store, memory (via task-utils-v2), event-bus | NO — learning |
| `workflow/global-state-engine.js` | Global state aggregation | (not reviewed) | — | **POTENTIAL DUPLICATE of state-manager** |

### E. OBSERVABILITY (5 files)
Monitoring, auditing, metrics, health.

| File | Purpose | Callers | Dependents | Can remove? |
|------|---------|---------|------------|-------------|
| `workflow/event-bus.js` | Pub/sub event system | agent-executor, agent-orchestrator, self-healing-engine, state-manager, learning-loop-engine | event-schema-registry, event-validation-middleware | NO — event backbone |
| `workflow/event-schema-registry.js` | Schema validation for events | event-bus | Ajv | NO — validation |
| `workflow/event-validation-middleware.js` | Middleware for event validation | event-bus | schema-registry | NO — validation |
| `workflow/audit-engine.js` | Logs all events to audit.jsonl | event-integration | none | NO — audit trail |
| `workflow/metrics-engine.js` | Tracks agent/task/learning metrics | event-integration | none | NO — metrics |
| `workflow/framework-health.js` | Health scoring and recommendations | prompt-evolution-scheduler | reads metrics/* + logs/* | NO — health |

### F. LEGACY (8 files)
Old versions superseded by newer implementations.

| File | Superseded by | Can remove? |
|------|---------------|-------------|
| `scripts/init-project.js` | init-project-v2.js | YES (consider archiving) |
| `scripts/generate-prompt.js` | generate-prompt-v3.js | YES (check for references) |
| `scripts/task-utils.js` | task-utils-v2.js | YES (check for references) |
| `scripts/task-engine.js` | task-engine-v3.js | YES |
| `scripts/memory-manager.js` | memory-manager-v2.js | YES |
| `scripts/validate-project.js` | validate-project-v2.js | YES |
| `scripts/validate-planner-output.js` | (unclear) | MAYBE |
| `scripts/import-planner-output.js` | (unclear) | MAYBE |

### G. DEAD CODE / UNUSED (3 files)
No active references found.

| File | Evidence | Can remove? |
|------|----------|-------------|
| `scripts/append-memory.js` | No importers, no callers, no test coverage | YES |
| `scripts/generate-planner-prompt-v2.js` | No visible references | YES (verify) |
| `scripts/test-task-engine.js` | No visible references | YES (verify) |

---

## 6. DUPLICATED RESPONSIBILITIES IDENTIFIED

### 🔴 Critical Duplications

#### 1. `agent-runner.js` ↔ `agent-executor.js` — Overlap
- **agent-runner.js** builds agent context (lines 39-61), but **agent-executor.js** builds its OWN project bundle (lines 63-79) with the same data.
- `agent-runner.js` validateAgentOutput (lines 88-108) overlaps with `agent-executor.js` validateOutput (lines 269-287).
- **agent-runner.js** is only used by **pipeline-runner.js** which is rarely called directly (orchestrator is the real entry point).
- **Recommendation:** Merge agent-runner.js functionality into agent-executor.js, or deprecate agent-runner.js.

#### 2. `state-manager.js` ↔ `global-state-engine.js` — Likely Overlap
- `state-manager.js` handles per-project agent state with full CRUD.
- `global-state-engine.js` (not reviewed in detail) likely aggregates cross-project state.
- **Risk:** Two state management systems may conflict.
- **Recommendation:** Audit global-state-engine.js; if it duplicates state-manager, consolidate.

#### 3. `knowledge-indexer.js` ↔ `memory-retrieval-engine.js` — Overlapping Memory Access
- Both read from `memory/memory.json`.
- `knowledge-indexer.js` builds a graph; `memory-retrieval-engine.js` retrieves by relevance.
- These serve different purposes but could share the memory-reading utility.

### 🟡 Moderate Duplications

#### 4. `learning-loop-engine.js` ↔ `metrics-engine.js` — Overlapping Learning Metrics
- `learning-loop-engine.js` emits events about lessons, patterns, and importance.
- `metrics-engine.js` subscribes to those same events and persists similar data.
- The learning loop writes to memory directly; metrics writes to filesystem. Two different persistence strategies for overlapping data.

#### 5. `prompt-evolution-engine.js` ↔ `prompt-experiment-engine.js` — Related Evolution Logic
- Evolution engine generates candidates and evaluates auto-promotion.
- Experiment engine runs A/B tests between versions.
- **These could be merged** — the experiment engine is a lightweight extension of the evolution cycle.

#### 6. `prompt-analyzer.js` ↔ `framework-health.js` — Overlapping Analysis
- Both read `logs/audit.jsonl` and `metrics/*.json`.
- Both detect bottlenecks and risks.
- Prompt analyzer focuses on prompt-specific weaknesses; framework-health focuses on system health.
- Shared reading logic could be extracted.

### Duplicate Validation Logic

#### 7. Scripts vs Workflow Validation
- `scripts/validation/` contains 5 validators (dependency, memory, project, summary, task).
- `validation/` directory contains content-validator, phase-gate-validator, validate-agent-handoff.
- Core workflow has `unified-validation-pipeline.js`.
- **Three separate validation systems** with overlapping concerns.

---

## 7. OVERLAPPING ENGINES

| Engine | Overlaps With | Nature of Overlap |
|--------|---------------|-------------------|
| `agent-runner.js` | `agent-executor.js` | Context building + validation duplicated |
| `learning-loop-engine.js` | `metrics-engine.js` | Both track learning outcomes |
| `knowledge-indexer.js` | `memory-retrieval-engine.js` | Both read memory.json |
| `global-state-engine.js` | `state-manager.js` | Potential state management duplication |
| `prompt-experiment-engine.js` | `prompt-evolution-engine.js` | Both handle prompt version comparisons |

---

## 8. UNNECESSARY ABSTRACTION LAYERS

### Layer 1: `pipeline-runner.js` → `agent-runner.js` → `agent-executor.js`
Three layers of abstraction for what is essentially: validate → build context → execute agent.
- **pipeline-runner.js** validates project state
- **agent-runner.js** builds context + validates output
- **agent-executor.js** loads prompt, runs LLM, validates schema, writes artifact

The middle layer (agent-runner) adds minimal value — it's barely called outside pipeline-runner.

### Layer 2: Event Validation Stack
- `event-bus.js` → initializes `event-schema-registry.js` and `event-validation-middleware.js`
- The middleware pattern adds complexity: 3 files for event publishing with schema validation.
- For the current scale (14 event types, single bus instance), this is over-engineered.

### Layer 3: Separate Scheduler vs Direct Evolution
- `prompt-evolution-scheduler.js` wraps `prompt-evolution-engine.runEvolutionCycle()` with health checks.
- The scheduler could be simplified into a single `runEvolutionCycle(options)` with optional interval.

---

## 9. OBSOLETE SCRIPTS

| Script | Status | Reason |
|--------|--------|--------|
| `scripts/append-memory.js` | **DEAD** | No callers, no tests. Memory is managed by learning-loop-engine |
| `scripts/generate-prompt.js` | **LEGACY** | v3 exists |
| `scripts/init-project.js` | **LEGACY** | v2 exists |
| `scripts/task-utils.js` | **LEGACY** | v2 exists |
| `scripts/memory-manager.js` | **LEGACY** | v2 exists |
| `scripts/task-engine.js` | **LEGACY** | v3 exists |
| `scripts/validate-project.js` | **LEGACY** | v2 exists (and is in package.json scripts) |
| `scripts/validate-planner-output.js` | **MAYBE DEAD** | No visible references |
| `scripts/import-planner-output.js` | **MAYBE DEAD** | No visible references |
| `scripts/generate-planner-prompt-v2.js` | **MAYBE DEAD** | No visible references |
| `scripts/test-task-engine.js` | **MAYBE DEAD** | Test script, not in main workflow |

---

## 10. SIMPLIFICATION RECOMMENDATIONS

### Phase A — Immediate (Safe, Low Risk)

1. **Archive `scripts/append-memory.js`** — No callers
2. **Archive `scripts/generate-planner-prompt-v2.js`** — No visible references
3. **Archive `scripts/test-task-engine.js`** — Test-only, no workflow refs
4. **Normalize legacy scripts:** Keep only `*-v2.js` / `*-v3.js` variants, archive the old ones

### Phase B — Merge Overlapping Engines (Medium Risk)

5. **Merge agent-runner into agent-executor:**
   - Move `buildAgentContext()` into agent-executor (it's already partially there as `loadProjectBundle()`)
   - Keep `validateAgentOutput()` but consolidate with agent-executor's `validateOutput()`
   - Remove agent-runner.js as separate file

6. **Consolidate prompt-experiment-engine into prompt-evolution-engine:**
   - A/B testing is a natural part of the evolution cycle
   - Add experiment methods directly to evolution engine

7. **Extract shared file reader utility:**
   - Both prompt-analyzer and framework-health read audit logs and metrics
   - Create a shared `observability-reader.js` utility

### Phase C — Remove Unnecessary Abstraction (Requires Testing)

8. **Simplify event validation stack:**
   - Inline the middleware into event-bus.js
   - Keep schema-registry separate but remove middleware wrapper

9. **Evaluate global-state-engine.js:**
   - Determine if it provides value beyond state-manager
   - If not, archive and redirect to state-manager

### Phase D — Consolidate Validation Systems (Requires Audit)

10. **Merge `scripts/validation/` and `validation/` directories:**
    - unified-validation-pipeline should be the single gateway
    - Remove duplicate validators

---

## 11. CURRENT FILE TALLY

| Category | Count |
|----------|-------|
| **A. Core Runtime** | 7 |
| **B. Required Infrastructure** | 6 |
| **C. Evolution System** | 5 |
| **D. Learning System** | 4 |
| **E. Observability** | 6 |
| **F. Legacy** | 8 |
| **G. Dead Code** | 3 |
| **Total workflow files** | 28 |
| **Total scripts** | ~26 |
| **Total test files** | 6 |
| **Total repository files** | ~60+ |

### Simplification Target

After Phase A + B + C:
- Remove ~8 legacy files (archive)
- Remove ~3 dead files
- Merge ~2 engines (agent-runner into agent-executor)
- Consolidate ~2 evolution engines
- **Target: ~15 fewer files, ~4 fewer abstractions**

---

## 12. EVENT FLOW SUMMARY

```
Agent Execution:
  agent-orchestrator.runStep()
    └── agent-executor.executeAgent()
          ├── "agent-executed" event (always)
          └── "artifact-written" event (if valid)
    └── state-manager.setAgentStatus()
          └── "state-updated" event
    └── transition-engine.evaluateTransition()
    └── learning-loop-engine.analyzeExecutionResults()
          ├── "lesson-learned" event
          ├── "memory-importance-updated" event
          └── "reusable-pattern-identified" event
    └── "agent-transitioned" event
    └── "task-status-updated" event (if changed)

Self-Healing:
  self-healing-engine.runSelfHealing()
    ├── "healing-attempted" event
    ├── "bug-pattern-recorded" event
    └── "healing-cycle-completed" event

Consumers:
  audit-engine.js   ← "*" wildcard (logs everything)
  metrics-engine.js ← 6 specific events
```

---

## 13. KEY FINDINGS SUMMARY

1. **agent-runner.js is a redundant layer** — its functionality is duplicated in agent-executor.js
2. **Two separate validation systems** — scripts/validation/ and validation/ directories
3. **knowledge-indexer.js** reads memory.json but doesn't provide runtime value — strategic-planner builds it but nothing consumes the graph
4. **prompt-experiment-engine.js** is standalone and disconnected from the evolution cycle
5. **Legacy script proliferation** — 8+ legacy scripts with v2/v3 variants
6. **Tight coupling via require()** — Many files use `require()` inline (e.g., event-bus within functions), suggesting runtime dependency only, not import-time coupling
7. **Missing shared reader utilities** — Multiple files independently implement readJson/readText helpers
8. **Event bus subscription model is clean** — audit-engine wildcard subscription is the right pattern