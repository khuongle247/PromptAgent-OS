# PromptAgent Framework VNext — Complete Architecture & Implementation Design

> **Author:** Principal AI Systems Architect  
> **Date:** 2026-06-21  
> **Status:** Final Design — Ready for Implementation  
> **Design Philosophy:** Optimize for maintainability, extensibility, reliability, future scalability, low technical debt. Not optimized for speed.

---

## Table of Contents

1. [Final Architecture](#part-1--final-architecture)
2. [Memory V3 Design](#part-2--memory-v3-design)
3. [Agent Contract System](#part-3--agent-contract-system)
4. [Architect Agent](#part-4--architect-agent)
5. [Role Prompt Framework V2](#part-5--role-prompt-framework-v2)
6. [Phase Gate System](#part-6--phase-gate-system)
7. [Agent Lifecycle](#part-7--agent-lifecycle)
8. [Quality Gates](#part-8--quality-gates)
9. [Future-Proof Architecture](#part-9--future-proof-architecture)
10. [Final Roadmap](#part-10--final-roadmap)

---

# Part 1 — Final Architecture

## 1.1 Folder Structure

```
PromptAgent/
│
├── package.json
├── Readme.md
│
├── schemas/                          # JSON Schema definitions — single source of truth
│   ├── project.schema.json           # Project metadata
│   ├── task.schema.json              # Task definition
│   ├── memory.schema.json            # Memory V3 — item-level schemas
│   ├── adr.schema.json               # Architecture Decision Record
│   ├── milestone.schema.json         # Milestone definition
│   ├── phase-gates.schema.json       # Phase gate completion criteria
│   ├── agent-state.schema.json       # Agent lifecycle state
│   ├── audit-log.schema.json         # Audit log entry
│   │
│   ├── contracts/                    # Agent handoff contracts
│   │   ├── planner-to-architect.schema.json
│   │   ├── architect-to-coder.schema.json
│   │   ├── coder-to-reviewer.schema.json
│   │   ├── reviewer-to-coder.schema.json
│   │   └── debugger-input.schema.json
│   │
│   └── outputs/                      # Agent output schemas
│       ├── planner-output.schema.json
│       ├── architect-output.schema.json
│       ├── coder-output.schema.json
│       ├── reviewer-output.schema.json
│       └── debugger-output.schema.json
│
├── agents/                           # Agent orchestration layer
│   ├── agent-state-machine.js        # State machine: idle→active→blocked→completed→failed→escalated
│   ├── agent-context.js              # Cross-agent context propagation
│   ├── agent-registry.js             # Agent discovery and capability lookup
│   └── agent-lifecycle.js            # Lifecycle hooks: onStart, onComplete, onFail, onEscalate
│
├── contracts/                        # Contract validation engine
│   ├── handoff-validator.js          # Generic handoff validator (loads contract schema, validates)
│   ├── quality-gates.js              # Quality gate checks for each transition
│   └── contract-registry.js          # Registry of all contracts with versioning
│
├── prompts/                          # Role prompts — structured, versioned
│   ├── planner.md
│   ├── architect.md
│   ├── coder.md
│   ├── reviewer.md
│   └── debugger.md
│
├── memory/                           # Memory system
│   ├── memory-manager-v3.js          # Memory CRUD with schema validation
│   ├── memory-summarizer.js          # Summary generation with importance scoring
│   ├── memory-archiver.js            # Archival and compaction
│   └── memory-query.js               # Query interface (by category, date, author, importance)
│
├── validation/                       # Validation layer
│   ├── validation-utils.js           # Shared utilities (AJV, report, file I/O)
│   ├── project-validator.js          # Project.json + docs validation
│   ├── task-validator.js             # Task schema + quality validation
│   ├── dependency-validator.js       # Dependency graph validation
│   ├── memory-validator.js           # Memory schema + integrity validation
│   ├── summary-validator.js          # Summary freshness + consistency
│   ├── milestone-validator.js        # Milestone + task cross-validation
│   ├── content-validator.js          # Content quality scoring
│   ├── phase-gate-validator.js       # Phase gate completion validation
│   ├── validate-agent-handoff.js     # Handoff contract validation
│   ├── quality-gates.js              # Quality gate execution
│   └── validate-project-v2.js        # Orchestrator — runs all validators
│
├── workflow/                         # Workflow engine
│   ├── phase-gate-engine.js          # Phase progression with gate checks
│   ├── task-engine-v4.js             # Task engine with history, critical path, dependency graph
│   ├── planner-pipeline.js           # Generate → Validate → Feedback → Import
│   ├── planner-feedback.js           # Structured feedback for planner correction
│   └── workflow-definitions.js       # Workflow definitions for each phase
│
├── scripts/                          # CLI entry points
│   ├── init-project-v2.js            # Project initialization
│   ├── create-task.js                # Task creation
│   ├── select-task.js                # Task selection
│   ├── complete-task.js              # Task completion with memory update
│   ├── rollback-task.js              # Task rollback
│   ├── generate-planner-prompt-v2.js # Planner prompt generation
│   ├── import-planner-output.js      # Planner output import
│   ├── validate-project-v2.js        # Full project validation
│   ├── advance-phase.js              # Phase advancement with gate check
│   └── audit-log.js                  # Audit log viewer
│
├── templates/                        # Project templates
│   ├── common/                       # Common template files
│   │   ├── docs/
│   │   └── context/
│   ├── flutter/
│   ├── react/
│   ├── nextjs/
│   ├── nodejs/
│   ├── spring-boot/
│   └── java-backend/
│
├── plugins/                          # Plugin system (Phase 7+)
│   ├── plugin-registry.js
│   ├── plugin-loader.js
│   └── plugin-api.js
│
├── tests/                            # Test suite
│   ├── unit/
│   │   ├── validators/
│   │   ├── memory/
│   │   ├── agents/
│   │   └── workflow/
│   ├── integration/
│   │   ├── planner-pipeline.test.js
│   │   ├── task-lifecycle.test.js
│   │   ├── memory-lifecycle.test.js
│   │   └── agent-handoff.test.js
│   └── fixtures/
│       ├── valid-project/
│       └── invalid-project/
│
└── docs/                             # Framework documentation
    ├── architecture.md
    ├── agents.md
    ├── contracts.md
    ├── memory.md
    ├── phases.md
    └── development.md
```

## 1.2 Folder Responsibilities

| Folder | Responsibility | Key Files |
|--------|---------------|-----------|
| `schemas/` | Single source of truth for all data structures. Every JSON file in the system must validate against a schema. | project.schema.json, task.schema.json, memory.schema.json, adr.schema.json |
| `schemas/contracts/` | Agent handoff contracts defining input/output/validation for each agent transition. | planner-to-architect.schema.json, architect-to-coder.schema.json |
| `schemas/outputs/` | Agent output schemas defining what each agent must produce. | planner-output.schema.json, architect-output.schema.json |
| `agents/` | Agent orchestration — state machine, context propagation, lifecycle hooks. | agent-state-machine.js, agent-context.js |
| `contracts/` | Contract validation engine — loads contract schemas and validates handoffs. | handoff-validator.js, quality-gates.js |
| `prompts/` | Structured role prompts with input/output/coordination/validation sections. | planner.md, architect.md, coder.md, reviewer.md, debugger.md |
| `memory/` | Memory system with schema validation, summarization, archival, querying. | memory-manager-v3.js, memory-summarizer.js |
| `validation/` | All validators — schema, content, dependency, phase gate, handoff, quality. | project-validator.js, phase-gate-validator.js |
| `workflow/` | Workflow engine — phase gates, task engine, planner pipeline, feedback loop. | phase-gate-engine.js, task-engine-v4.js |
| `scripts/` | CLI entry points for all operations. | init-project-v2.js, advance-phase.js |
| `plugins/` | Plugin system for third-party extensions (Phase 7+). | plugin-registry.js |
| `tests/` | Unit and integration tests for all components. | validators/, integration/ |

## 1.3 Architecture Principles

1. **Schema-first design** — Every data structure has a JSON Schema. No unvalidated data enters the system.
2. **Contract-driven handoffs** — Every agent transition has a formal contract with input/output/validation/quality gates.
3. **Event-driven reactivity** — State changes emit events that trigger automatic side effects (memory update, next task selection, agent notification).
4. **Layered validation** — Data is validated at entry (schema), during processing (business rules), and at exit (quality gates).
5. **Append-only audit** — Every state change is recorded in an append-only audit log. No data is ever deleted without a log entry.
6. **Plugin-based extensibility** — New stacks, validators, and agents are added via plugins without modifying core framework code.
7. **Versioned schemas** — All schemas have a version field. Migration scripts exist for version upgrades.

---

# Part 2 — Memory V3 Design

## 2.1 Design Goals

- **Data integrity** — Every memory record has required fields and type-specific validation
- **Trustworthiness** — Agents can trust that memory records are complete and valid
- **Queryability** — Memory can be queried by category, date, author, importance, and status
- **Lifecycle management** — Records have a lifecycle (active → archived → purged)
- **Importance model** — Records are scored by importance for summary generation
- **Referential integrity** — Memory records can reference task IDs, project IDs, and other memory records

## 2.2 memory.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Memory V3 Schema",
  "type": "object",
  "required": ["schemaVersion", "decisions", "architecture", "completedTasks", "bugs", "conventions", "risks"],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "enum": ["3.0.0"]
    },
    "decisions": {
      "type": "array",
      "description": "Architectural and design decisions made during the project",
      "items": { "$ref": "#/definitions/DecisionRecord" }
    },
    "architecture": {
      "type": "array",
      "description": "Architecture Decision Records (ADRs)",
      "items": { "$ref": "#/definitions/ArchitectureRecord" }
    },
    "completedTasks": {
      "type": "array",
      "description": "Records of completed tasks with results",
      "items": { "$ref": "#/definitions/CompletedTaskRecord" }
    },
    "bugs": {
      "type": "array",
      "description": "Bug reports with root cause analysis",
      "items": { "$ref": "#/definitions/BugRecord" }
    },
    "conventions": {
      "type": "array",
      "description": "Coding conventions and patterns established",
      "items": { "$ref": "#/definitions/ConventionRecord" }
    },
    "risks": {
      "type": "array",
      "description": "Identified risks with mitigation strategies",
      "items": { "$ref": "#/definitions/RiskRecord" }
    }
  },
  "definitions": {
    "BaseRecord": {
      "type": "object",
      "required": ["id", "type", "timestamp", "author", "description", "importance"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^MEM-[0-9]{3,}$",
          "description": "Unique memory record identifier"
        },
        "type": {
          "type": "string",
          "enum": ["decision", "architecture", "completedTask", "bug", "convention", "risk"],
          "description": "Record type matching the parent category"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp of record creation"
        },
        "author": {
          "type": "string",
          "enum": ["planner", "architect", "coder", "reviewer", "debugger", "human", "system"],
          "description": "Agent or person who created the record"
        },
        "description": {
          "type": "string",
          "minLength": 10,
          "description": "Human-readable description of the record"
        },
        "importance": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5,
          "description": "Importance score: 1=trivial, 2=minor, 3=notable, 4=important, 5=critical"
        },
        "status": {
          "type": "string",
          "enum": ["active", "archived", "superseded"],
          "default": "active",
          "description": "Lifecycle status of the record"
        },
        "references": {
          "type": "array",
          "description": "References to related task IDs, memory IDs, or external resources",
          "items": {
            "type": "string"
          }
        },
        "tags": {
          "type": "array",
          "description": "Free-form tags for categorization and search",
          "items": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "DecisionRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["rationale", "alternatives"],
      "properties": {
        "rationale": {
          "type": "string",
          "minLength": 20,
          "description": "Reasoning behind the decision"
        },
        "alternatives": {
          "type": "array",
          "minItems": 1,
          "description": "Alternative options considered",
          "items": {
            "type": "object",
            "required": ["name", "pros", "cons"],
            "properties": {
              "name": { "type": "string", "minLength": 3 },
              "pros": { "type": "array", "items": { "type": "string" } },
              "cons": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "outcome": {
          "type": "string",
          "description": "Actual outcome after implementation (filled after task completion)"
        }
      }
    },
    "ArchitectureRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["adrId", "context", "decision", "consequences", "status"],
      "properties": {
        "adrId": {
          "type": "string",
          "pattern": "^ADR-[0-9]{3}$",
          "description": "Architecture Decision Record identifier"
        },
        "title": {
          "type": "string",
          "minLength": 10,
          "description": "Descriptive title of the architecture decision"
        },
        "context": {
          "type": "string",
          "minLength": 20,
          "description": "Context and forces that led to this decision"
        },
        "decision": {
          "type": "string",
          "minLength": 20,
          "description": "The architecture decision itself"
        },
        "consequences": {
          "type": "string",
          "minLength": 20,
          "description": "Positive and negative consequences of the decision"
        },
        "status": {
          "type": "string",
          "enum": ["proposed", "accepted", "deprecated", "superseded"],
          "description": "ADR lifecycle status"
        },
        "supersededBy": {
          "type": "string",
          "pattern": "^ADR-[0-9]{3}$",
          "description": "If status is superseded, the ADR that replaced this one"
        }
      }
    },
    "CompletedTaskRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["taskId", "result", "filesChanged"],
      "properties": {
        "taskId": {
          "type": "string",
          "pattern": "^TASK-[0-9]{3,}$",
          "description": "Reference to the completed task"
        },
        "result": {
          "type": "string",
          "minLength": 20,
          "description": "Summary of what was accomplished"
        },
        "filesChanged": {
          "type": "array",
          "minItems": 1,
          "description": "Files modified during task completion",
          "items": { "type": "string" }
        },
        "testsRun": {
          "type": "array",
          "description": "Tests executed and their results",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "result": { "type": "string", "enum": ["passed", "failed", "skipped"] }
            }
          }
        },
        "decisions": {
          "type": "array",
          "description": "Decisions made during implementation",
          "items": { "type": "string" }
        },
        "cycleTime": {
          "type": "string",
          "description": "Time spent on this task (e.g., '4h', '2d')"
        }
      }
    },
    "BugRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["severity", "rootCause", "fixDescription"],
      "properties": {
        "severity": {
          "type": "string",
          "enum": ["P0-critical", "P1-high", "P2-medium", "P3-low"],
          "description": "Bug severity classification"
        },
        "rootCause": {
          "type": "string",
          "minLength": 20,
          "description": "Root cause analysis"
        },
        "fixDescription": {
          "type": "string",
          "minLength": 20,
          "description": "Description of the fix applied"
        },
        "fixVersion": {
          "type": "string",
          "description": "Version or commit where the fix was applied"
        },
        "reproductionSteps": {
          "type": "array",
          "description": "Steps to reproduce the bug",
          "items": { "type": "string" }
        },
        "relatedTaskId": {
          "type": "string",
          "pattern": "^TASK-[0-9]{3,}$",
          "description": "Task that introduced or fixed the bug"
        }
      }
    },
    "ConventionRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["scope", "enforcement"],
      "properties": {
        "scope": {
          "type": "string",
          "enum": ["global", "module", "file", "pattern"],
          "description": "Scope of the convention"
        },
        "enforcement": {
          "type": "string",
          "enum": ["automated", "manual", "guideline"],
          "description": "How the convention is enforced"
        },
        "example": {
          "type": "string",
          "description": "Code example demonstrating the convention"
        }
      }
    },
    "RiskRecord": {
      "type": "object",
      "allOf": [{ "$ref": "#/definitions/BaseRecord" }],
      "required": ["probability", "impact", "mitigation"],
      "properties": {
        "probability": {
          "type": "string",
          "enum": ["low", "medium", "high"],
          "description": "Probability of the risk occurring"
        },
        "impact": {
          "type": "string",
          "enum": ["low", "medium", "high", "critical"],
          "description": "Impact if the risk materializes"
        },
        "mitigation": {
          "type": "string",
          "minLength": 20,
          "description": "Mitigation strategy"
        },
        "owner": {
          "type": "string",
          "enum": ["planner", "architect", "coder", "reviewer", "debugger", "human"],
          "description": "Who is responsible for monitoring this risk"
        },
        "status": {
          "type": "string",
          "enum": ["identified", "monitoring", "mitigated", "realized", "closed"],
          "description": "Risk lifecycle status"
        }
      }
    }
  }
}
```

## 2.3 Memory Lifecycle

```
Record Created (active)
    │
    ├──→ Archived (after N months or when superseded)
    │       │
    │       └──→ Purged (after N years or on explicit request)
    │
    └──→ Superseded (replaced by a newer record)
            │
            └──→ Archived
```

| Phase | Trigger | Action |
|-------|---------|--------|
| **Active** | Record creation | Record is in main memory.json, included in summaries |
| **Archived** | Age > 6 months OR importance < 3 AND age > 3 months | Moved to memory-archive.json, excluded from active summaries |
| **Superseded** | Newer record explicitly supersedes this one | Status set to superseded, linked to superseding record |
| **Purged** | Age > 2 years OR explicit user request | Removed from all storage, logged in audit trail |

## 2.4 Importance Model

| Score | Label | Criteria | Summary Inclusion |
|-------|-------|----------|-------------------|
| 5 | Critical | Blocking decision, P0 bug, architecture-altering risk | Always included |
| 4 | Important | Major decision, P1 bug, significant convention | Included in full summary |
| 3 | Notable | Standard decision, P2 bug, useful convention | Included in detailed summary |
| 2 | Minor | Routine decision, P3 bug, minor convention | Included only on request |
| 1 | Trivial | Obvious decision, informational only | Excluded from summaries |

## 2.5 Retention Strategy

| Category | Active Duration | Archive After | Purge After |
|----------|----------------|---------------|-------------|
| decisions | 12 months | 12 months | 3 years |
| architecture | Indefinite (ADRs are permanent) | Never | Never |
| completedTasks | 6 months | 6 months | 2 years |
| bugs | 12 months (P0-P1), 6 months (P2-P3) | 12 months | 3 years |
| conventions | Indefinite (project lifetime) | When project is archived | Never |
| risks | Until status is "closed" | 3 months after closed | 1 year after closed |

---

# Part 3 — Agent Contract System

## 3.1 Contract Architecture

Every agent handoff follows this pattern:

```
Agent A ──(output)──→ Handoff Validator ──(validated output)──→ Agent B
                            │
                            └──→ Quality Gates ──(pass/fail)──→ Agent B or Reject
```

Each contract defines:
- **sourceAgent**: Who produces the output
- **targetAgent**: Who consumes the output
- **inputSchema**: What the source agent receives (reference to schema)
- **outputSchema**: What the source agent must produce (reference to schema)
- **validationRules**: Rules that the output must satisfy
- **qualityGates**: Additional checks beyond schema validation
- **errorCodes**: Map of error codes to descriptions for feedback

## 3.2 planner-output.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Planner Output Schema",
  "type": "object",
  "required": ["tasks", "milestones", "metadata"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["plannerVersion", "generatedAt", "source", "taskCount"],
      "properties": {
        "plannerVersion": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "source": { "type": "string", "enum": ["human", "planner-agent", "system"] },
        "taskCount": { "type": "integer", "minimum": 1 },
        "assumptions": {
          "type": "array",
          "description": "Assumptions made during planning",
          "items": { "type": "string" }
        }
      }
    },
    "tasks": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title", "module", "priority", "status", "dependencies", "acceptanceCriteria", "definitionOfDone", "estimate", "assignee"],
        "properties": {
          "id": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" },
          "title": { "type": "string", "minLength": 10 },
          "module": { "type": "string", "minLength": 2 },
          "priority": { "type": "string", "enum": ["P1", "P2", "P3"] },
          "status": { "type": "string", "enum": ["todo", "in_progress", "blocked", "review", "done", "cancelled"] },
          "dependencies": {
            "type": "array",
            "items": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
          },
          "acceptanceCriteria": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "minLength": 10 }
          },
          "definitionOfDone": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "minLength": 10 }
          },
          "estimate": {
            "type": "string",
            "pattern": "^[0-9]+[mhdw]$",
            "description": "Estimate in minutes/hours/days/weeks (e.g., 4h, 2d, 1w)"
          },
          "assignee": {
            "type": "string",
            "enum": ["architect", "coder", "reviewer", "debugger"]
          },
          "milestoneId": {
            "type": "string",
            "pattern": "^MS-[0-9]{3}$"
          },
          "description": {
            "type": "string",
            "minLength": 20,
            "description": "Detailed description of the task"
          },
          "technicalNotes": {
            "type": "string",
            "description": "Technical considerations for the implementer"
          }
        }
      }
    },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "tasks", "targetDate"],
        "properties": {
          "id": { "type": "string", "pattern": "^MS-[0-9]{3}$" },
          "title": { "type": "string", "minLength": 5 },
          "description": { "type": "string", "minLength": 20 },
          "tasks": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
          },
          "targetDate": { "type": "string", "format": "date" },
          "status": { "type": "string", "enum": ["planned", "in_progress", "completed", "delayed"] }
        }
      }
    },
    "risks": {
      "type": "array",
      "description": "Risks identified during planning",
      "items": {
        "type": "object",
        "required": ["description", "probability", "impact"],
        "properties": {
          "description": { "type": "string", "minLength": 10 },
          "probability": { "type": "string", "enum": ["low", "medium", "high"] },
          "impact": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
          "mitigation": { "type": "string" }
        }
      }
    }
  }
}
```

**Validation Rules:**
1. All task IDs must be unique
2. All task titles must be unique (case-insensitive)
3. Dependencies must reference existing task IDs
4. No circular dependencies
5. No task can depend on itself
6. Milestone task references must match existing task IDs
7. At least one milestone must exist
8. All tasks must have acceptance criteria with minLength 10
9. All tasks must have definition of done with minLength 10
10. Estimate must match pattern `^[0-9]+[mhdw]$`

**Handoff Rules (Planner → Architect):**
1. Planner output must pass all validation rules
2. Quality gate: All tasks have acceptance criteria with minLength 10
3. Quality gate: Dependency graph has no cycles
4. Quality gate: At least one milestone is defined
5. On failure: Generate structured feedback and return to Planner (max 3 retries)

## 3.3 architect-output.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Architect Output Schema",
  "type": "object",
  "required": ["metadata", "decisions", "architectureUpdates", "taskAssignments"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["architectVersion", "generatedAt", "adrCount"],
      "properties": {
        "architectVersion": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "adrCount": { "type": "integer", "minimum": 1 }
      }
    },
    "decisions": {
      "type": "array",
      "description": "Architecture Decision Records created by the architect",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["adrId", "title", "context", "decision", "consequences", "status"],
        "properties": {
          "adrId": { "type": "string", "pattern": "^ADR-[0-9]{3}$" },
          "title": { "type": "string", "minLength": 10 },
          "context": { "type": "string", "minLength": 20 },
          "decision": { "type": "string", "minLength": 20 },
          "consequences": { "type": "string", "minLength": 20 },
          "alternatives": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["name", "pros", "cons"],
              "properties": {
                "name": { "type": "string" },
                "pros": { "type": "array", "items": { "type": "string" } },
                "cons": { "type": "array", "items": { "type": "string" } }
              }
            }
          },
          "status": { "type": "string", "enum": ["proposed", "accepted"] },
          "relatedTasks": {
            "type": "array",
            "items": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
          }
        }
      }
    },
    "architectureUpdates": {
      "type": "array",
      "description": "Files to update with architecture documentation",
      "items": {
        "type": "object",
        "required": ["file", "content"],
        "properties": {
          "file": { "type": "string" },
          "content": { "type": "string", "minLength": 20 }
        }
      }
    },
    "taskAssignments": {
      "type": "array",
      "description": "Task-to-architecture mapping",
      "items": {
        "type": "object",
        "required": ["taskId", "adrReferences", "implementationGuidance"],
        "properties": {
          "taskId": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" },
          "adrReferences": {
            "type": "array",
            "items": { "type": "string", "pattern": "^ADR-[0-9]{3}$" }
          },
          "implementationGuidance": {
            "type": "string",
            "minLength": 20,
            "description": "Specific guidance for implementing this task within the architecture"
          }
        }
      }
    },
    "risks": {
      "type": "array",
      "description": "Architecture-level risks identified",
      "items": {
        "type": "object",
        "required": ["description", "probability", "impact", "mitigation"],
        "properties": {
          "description": { "type": "string", "minLength": 10 },
          "probability": { "type": "string", "enum": ["low", "medium", "high"] },
          "impact": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
          "mitigation": { "type": "string", "minLength": 20 }
        }
      }
    }
  }
}
```

**Validation Rules:**
1. All ADR IDs must be unique
2. ADR titles must be unique (case-insensitive)
3. ADR status must be "proposed" or "accepted" (not deprecated or superseded at creation)
4. Every task in planner output must have at least one ADR reference
5. Architecture updates must reference files that exist in the project
6. At least one ADR must be created

**Handoff Rules (Architect → Coder):**
1. Architect output must pass all validation rules
2. Quality gate: Every task has implementation guidance
3. Quality gate: All ADRs have context, decision, and consequences
4. Quality gate: Architecture risks are documented
5. On failure: Generate structured feedback and return to Architect (max 3 retries)

## 3.4 coder-output.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Coder Output Schema",
  "type": "object",
  "required": ["metadata", "taskId", "filesChanged", "testResults", "memoryUpdates"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["coderVersion", "generatedAt", "taskId"],
      "properties": {
        "coderVersion": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "taskId": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
      }
    },
    "taskId": {
      "type": "string",
      "pattern": "^TASK-[0-9]{3,}$",
      "description": "The task that was implemented"
    },
    "filesChanged": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["path", "changeType", "summary"],
        "properties": {
          "path": { "type": "string" },
          "changeType": { "type": "string", "enum": ["created", "modified", "deleted"] },
          "summary": { "type": "string", "minLength": 10 }
        }
      }
    },
    "testResults": {
      "type": "object",
      "required": ["total", "passed", "failed", "skipped"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "passed": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "skipped": { "type": "integer", "minimum": 0 },
        "details": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "result": { "type": "string", "enum": ["passed", "failed", "skipped"] },
              "duration": { "type": "string" }
            }
          }
        }
      }
    },
    "lintResults": {
      "type": "object",
      "properties": {
        "passed": { "type": "boolean" },
        "errors": { "type": "integer", "minimum": 0 },
        "warnings": { "type": "integer", "minimum": 0 }
      }
    },
    "memoryUpdates": {
      "type": "array",
      "description": "Memory records to create or update",
      "items": {
        "type": "object",
        "required": ["category", "record"],
        "properties": {
          "category": {
            "type": "string",
            "enum": ["decisions", "architecture", "completedTasks", "bugs", "conventions", "risks"]
          },
          "record": {
            "type": "object",
            "description": "Memory record following memory.schema.json item schema"
          }
        }
      }
    },
    "acceptanceVerification": {
      "type": "array",
      "description": "Verification that each acceptance criterion is met",
      "items": {
        "type": "object",
        "required": ["criterion", "verified", "evidence"],
        "properties": {
          "criterion": { "type": "string" },
          "verified": { "type": "boolean" },
          "evidence": { "type": "string", "description": "How the criterion was verified" }
        }
      }
    },
    "decisions": {
      "type": "array",
      "description": "Decisions made during implementation",
      "items": {
        "type": "object",
        "required": ["description", "rationale"],
        "properties": {
          "description": { "type": "string", "minLength": 10 },
          "rationale": { "type": "string", "minLength": 20 }
        }
      }
    }
  }
}
```

**Validation Rules:**
1. taskId must reference an existing task
2. At least one file must be changed
3. Test results must be reported (total >= 0)
4. If tests failed, failed count must be > 0 and explanation required
5. Acceptance verification must cover all acceptance criteria
6. Memory updates must follow memory.schema.json item schemas

**Handoff Rules (Coder → Reviewer):**
1. Coder output must pass all validation rules
2. Quality gate: All tests pass (failed === 0)
3. Quality gate: Lint passes (errors === 0)
4. Quality gate: All acceptance criteria are verified
5. Quality gate: At least one memory update is proposed
6. On failure: Generate structured feedback and return to Coder (max 3 retries)

## 3.5 reviewer-output.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Reviewer Output Schema",
  "type": "object",
  "required": ["metadata", "taskId", "decision", "reviewItems", "summary"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["reviewerVersion", "generatedAt", "taskId"],
      "properties": {
        "reviewerVersion": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "taskId": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
      }
    },
    "taskId": {
      "type": "string",
      "pattern": "^TASK-[0-9]{3,}$"
    },
    "decision": {
      "type": "string",
      "enum": ["approved", "changes-requested", "rejected"],
      "description": "Overall review decision"
    },
    "reviewItems": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["category", "severity", "description", "location", "actionable"],
        "properties": {
          "category": {
            "type": "string",
            "enum": ["correctness", "security", "performance", "style", "test-coverage", "architecture-compliance", "acceptance-criteria"]
          },
          "severity": {
            "type": "string",
            "enum": ["P0-blocker", "P1-critical", "P2-major", "P3-minor", "P4-suggestion"]
          },
          "description": { "type": "string", "minLength": 10 },
          "location": { "type": "string", "description": "File and line number if applicable" },
          "actionable": { "type": "boolean", "description": "Whether this item requires action" },
          "suggestion": { "type": "string", "description": "Suggested fix or improvement" }
        }
      }
    },
    "acceptanceVerification": {
      "type": "array",
      "description": "Independent verification of acceptance criteria",
      "items": {
        "type": "object",
        "required": ["criterion", "verified", "notes"],
        "properties": {
          "criterion": { "type": "string" },
          "verified": { "type": "boolean" },
          "notes": { "type": "string" }
        }
      }
    },
    "summary": {
      "type": "string",
      "minLength": 20,
      "description": "Overall review summary"
    },
    "memoryUpdates": {
      "type": "array",
      "description": "Memory records to create (bugs found, conventions noted)",
      "items": {
        "type": "object",
        "required": ["category", "record"],
        "properties": {
          "category": {
            "type": "string",
            "enum": ["bugs", "conventions", "risks"]
          },
          "record": {
            "type": "object",
            "description": "Memory record following memory.schema.json item schema"
          }
        }
      }
    }
  }
}
```

**Validation Rules:**
1. taskId must reference an existing task
2. At least one review item must exist
3. Every review item must have a severity
4. If decision is "rejected", at least one P0-blocker item must exist
5. If decision is "changes-requested", at least one P0-P2 item must exist
6. If decision is "approved", no P0-P1 items should exist
7. Acceptance verification must cover all acceptance criteria

**Handoff Rules (Reviewer → Coder):**
1. If decision is "approved": Task is marked done, memory is updated, next task is selected
2. If decision is "changes-requested": Task status is set to "in_progress", feedback is sent to Coder
3. If decision is "rejected": Task status is set to "blocked", escalation is triggered
4. Quality gate: Review items are actionable and have clear locations
5. Quality gate: Memory updates are proposed for bugs and conventions found

## 3.6 debugger-input.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Debugger Input Schema",
  "type": "object",
  "required": ["metadata", "symptoms", "environment", "reproductionSteps"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["debuggerVersion", "generatedAt", "source"],
      "properties": {
        "debuggerVersion": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "source": { "type": "string", "enum": ["human", "reviewer", "system", "coder"] },
        "relatedTaskId": { "type": "string", "pattern": "^TASK-[0-9]{3,}$" }
      }
    },
    "symptoms": {
      "type": "array",
      "minItems": 1,
      "description": "Observed symptoms of the bug",
      "items": { "type": "string", "minLength": 10 }
    },
    "environment": {
      "type": "object",
      "required": ["os", "runtime", "version"],
      "properties": {
        "os": { "type": "string" },
        "runtime": { "type": "string" },
        "version": { "type": "string" },
        "additionalContext": { "type": "string" }
      }
    },
    "reproductionSteps": {
      "type": "array",
      "minItems": 1,
      "description": "Steps to reproduce the bug",
      "items": { "type": "string" }
    },
    "expectedBehavior": {
      "type": "string",
      "minLength": 10,
      "description": "What should happen"
    },
    "actualBehavior": {
      "type": "string",
      "minLength": 10,
      "description": "What actually happens"
    },
    "logs": {
      "type": "array",
      "description": "Relevant log entries or error messages",
      "items": { "type": "string" }
    },
    "severity": {
      "type": "string",
      "enum": ["P0-critical", "P1-high", "P2-medium", "P3-low"]
    }
  }
}
```

**Handoff Rules (Debugger → Memory):**
1. Debugger output must include RCA with root cause identified
2. Quality gate: Fix description must be verifiable
3. Quality gate: Bug record is written to memory with severity classification
4. If fix is applied: Related task is created or updated

---

# Part 4 — Architect Agent

## 4.1 Role Definition

The Architect Agent is the bridge between Planning and Implementation. It receives the planner's task breakdown and produces architecture decisions that guide the Coder Agent.

## 4.2 Responsibilities

1. **Analyze planner output** — Review tasks, dependencies, and milestones for architectural implications
2. **Make architecture decisions** — Create ADRs for significant architectural choices
3. **Document architecture** — Update architecture.md with decisions, patterns, and guidelines
4. **Map tasks to architecture** — Assign ADR references to each task
5. **Provide implementation guidance** — Give coders specific guidance for each task
6. **Identify architecture risks** — Document risks that could affect the architecture
7. **Validate architecture consistency** — Ensure decisions are consistent across the project

## 4.3 Inputs

| Input | Source | Description |
|-------|--------|-------------|
| planner-output.json | Planner Agent | Task breakdown, milestones, dependencies |
| project.json | Project | Project metadata, type, phase |
| requirements.md | Project | Business requirements |
| features.md | Project | Feature specifications |
| tech-stack.md | Project | Technology stack |
| architecture.md | Project | Current architecture documentation |
| memory-summary.json | Memory | Previous architecture decisions and context |
| coding-rules.md | Project | Coding standards and conventions |

## 4.4 Outputs

| Output | Target | Description |
|--------|--------|-------------|
| architect-output.json | Coder Agent | ADRs, task assignments, implementation guidance |
| ADRs (in memory) | Memory System | Architecture Decision Records |
| architecture.md updates | Project | Updated architecture documentation |
| Risks (in memory) | Memory System | Architecture-level risks |

## 4.5 ADR Management

### ADR Lifecycle

```
Proposed ──→ Accepted ──→ Deprecated
    │                        │
    └──→ Rejected            └──→ Superseded (by new ADR)
```

| Status | Meaning | Allowed Transitions |
|--------|---------|---------------------|
| Proposed | ADR is suggested but not yet approved | → Accepted, → Rejected |
| Accepted | ADR is approved and active | → Deprecated, → Superseded |
| Deprecated | ADR is no longer recommended | → Superseded |
| Superseded | ADR has been replaced by a newer ADR | (terminal) |
| Rejected | ADR was considered but not adopted | (terminal) |

### ADR Template

```markdown
# ADR-{NNN}: {Title}

## Status
{proposed | accepted | deprecated | superseded}

## Context
{What is the issue that we're seeing that is motivating this decision or change?}

## Decision
{What is the change that we're proposing and/or doing?}

## Consequences
{What becomes easier or more difficult to do because of this change?}

## Alternatives Considered
- {Alternative 1}: {Pros/Cons}
- {Alternative 2}: {Pros/Cons}

## Related Tasks
- TASK-{NNN}: {Task title}
- TASK-{NNN}: {Task title}
```

## 4.6 Interaction with Planner

```
Planner ──(planner-output.json)──→ Architect
    │                                  │
    │                                  ├──→ Validate planner output
    │                                  ├──→ Analyze tasks for architecture needs
    │                                  ├──→ Create ADRs
    │                                  ├──→ Map tasks to ADRs
    │                                  └──→ Produce architect-output.json
    │                                       │
    │                                       └──→ Handoff Validator
    │                                            │
    │                                     ┌──────┴──────┐
    │                                     │  Pass?       │
    │                                     └──────┬──────┘
    │                                            │
    │                              Yes ←─────────┴─────────→ No
    │                                │                       │
    │                           To Coder              Feedback to Architect
    │                                                       │
    │                                                  Retry (max 3)
```

## 4.7 Interaction with Coder

```
Architect ──(architect-output.json)──→ Handoff Validator ──→ Coder
    │                                                          │
    │                                                          ├──→ Read ADRs
    │                                                          ├──→ Read implementation guidance
    │                                                          ├──→ Implement task
    │                                                          └──→ Produce coder-output.json
    │                                                               │
    │                                                          Coder may request clarification
    │                                                          from Architect via escalation
```

## 4.8 Full Workflow

```
1. Planner completes and produces planner-output.json
2. Handoff validator validates planner output
3. Architect receives validated planner output
4. Architect reads: project.json, requirements.md, features.md, tech-stack.md, architecture.md, memory-summary.json
5. Architect analyzes each task for architectural implications
6. For each significant architectural decision:
   a. Create ADR with context, decision, consequences, alternatives
   b. Set ADR status to "proposed"
7. Map each task to relevant ADRs
8. Write implementation guidance for each task
9. Identify architecture-level risks
10. Produce architect-output.json
11. Handoff validator validates architect output
12. If valid: Pass to Coder, write ADRs to memory, update architecture.md
13. If invalid: Generate feedback, return to Architect (max 3 retries)
14. After 3 retries: Escalate to human
```

---

# Part 5 — Role Prompt Framework V2

## 5.1 Standard Prompt Structure

Every role prompt follows this exact 10-section structure:

```
# {Role Name}

## Identity
{Who the agent is, their expertise level, and their place in the workflow}

## Objectives
{What the agent is expected to achieve in this role}

## Inputs
{What data the agent receives, with schema references}

## Outputs
{What the agent must produce, with schema references and field descriptions}

## Constraints
{Boundaries the agent must operate within}

## Quality Rules
{Specific quality criteria the agent's output must satisfy}

## Failure Handling
{What to do when inputs are invalid, requirements are ambiguous, or blockers are encountered}

## Handoff Rules
{Who the agent receives from, who the agent sends to, and the handoff protocol}

## Examples
{2-3 examples of valid output with explanations}

## Checklist
{A checklist the agent should verify before marking work as complete}
```

## 5.2 planner.md

```markdown
# Planner Agent

## Identity
You are a Senior Technical Planner with expertise in software project planning, task decomposition, dependency management, and effort estimation. You are the first agent in the PromptAgent workflow. Your output determines the quality of all downstream work.

## Objectives
- Analyze project requirements and features
- Decompose work into well-defined tasks
- Define task dependencies and ordering
- Estimate effort for each task
- Define acceptance criteria and definition of done
- Organize tasks into milestones
- Identify risks and assumptions

## Inputs
- `project.json` — Project metadata, type, phase, current role
- `docs/requirements.md` — Business requirements and problem statement
- `docs/features.md` — Feature specifications with user stories
- `docs/architecture.md` — Current architecture documentation (may be empty for new projects)
- `context/tech-stack.md` — Technology stack and versions
- `context/coding-rules.md` — Coding standards and conventions
- `memory/memory-summary.json` — Previous decisions, completed tasks, known bugs, risks
- `tasks/tasks.json` — Existing tasks (if any)
- `tasks/milestones.json` — Existing milestones (if any)

## Outputs
You must produce a valid `planner-output.json` file following `schemas/outputs/planner-output.schema.json`.

Required fields:
- `metadata.plannerVersion` — Version of the planner agent
- `metadata.generatedAt` — ISO 8601 timestamp
- `metadata.source` — Must be "planner-agent"
- `metadata.taskCount` — Number of tasks created
- `tasks[]` — Array of task objects, each with:
  - `id` — Pattern: TASK-{NNN} (e.g., TASK-001)
  - `title` — Descriptive title (min 10 characters)
  - `module` — Module name (e.g., AUTH, PAYMENT, UI)
  - `priority` — P1 (critical), P2 (important), P3 (nice-to-have)
  - `status` — Must be "todo" for new tasks
  - `dependencies` — Array of task IDs this task depends on
  - `acceptanceCriteria` — Array of measurable criteria (min 1, each min 10 chars)
  - `definitionOfDone` — Array of completion requirements (min 1, each min 10 chars)
  - `estimate` — Effort estimate matching pattern ^[0-9]+[mhdw]$ (e.g., 4h, 2d, 1w)
  - `assignee` — Must be "architect", "coder", "reviewer", or "debugger"
  - `milestoneId` — Reference to a milestone ID
  - `description` — Detailed task description (min 20 characters)
  - `technicalNotes` — Technical considerations for implementation
- `milestones[]` — Array of milestone objects, each with:
  - `id` — Pattern: MS-{NNN} (e.g., MS-001)
  - `title` — Descriptive title (min 5 characters)
  - `description` — Milestone scope description (min 20 characters)
  - `tasks` — Array of task IDs belonging to this milestone
  - `targetDate` — Target completion date (ISO 8601 date)
  - `status` — Must be "planned" for new milestones
- `risks[]` — Array of risk objects (optional)

## Constraints
1. Do NOT create tasks for work that is out of scope
2. Do NOT create more than 20 tasks per planning session (break into multiple sessions if needed)
3. Do NOT create circular dependencies
4. Do NOT create tasks without acceptance criteria
5. Do NOT assign tasks to agents that don't exist yet (e.g., don't assign to "debugger" if debugger agent is not implemented)
6. Keep task granularity at 2-8 hours of work
7. Group related tasks under the same milestone

## Quality Rules
1. Every task must have at least 3 acceptance criteria
2. Every task must have at least 2 definition of done items
3. Dependencies must form a directed acyclic graph (DAG)
4. The dependency graph should have a single starting point (tasks with no dependencies)
5. Milestones should have 3-8 tasks each
6. Task titles should be unique and descriptive
7. Estimates should be realistic (not all 1h or all 1w)

## Failure Handling
1. If requirements are ambiguous: Document your assumptions in `metadata.assumptions`
2. If dependencies cannot be resolved: Flag the task as blocked and document the reason
3. If the project type is unknown: Use "fullstack" as default and document the assumption
4. If existing tasks conflict with new tasks: Document the conflict and propose resolution
5. If you cannot complete planning: Output what you have and flag remaining work

## Handoff Rules
- **Receive from:** Human (via project requirements and features)
- **Send to:** Architect Agent
- **Handoff artifact:** `planner-output.json`
- **Handoff validation:** The handoff validator will check:
  1. All tasks have valid IDs and titles
  2. All dependencies reference existing tasks
  3. No circular dependencies exist
  4. All tasks have acceptance criteria and definition of done
  5. At least one milestone exists
- **On validation failure:** You will receive structured feedback. Read it carefully, fix the issues, and regenerate. Maximum 3 retries before escalation.

## Examples

### Example 1: Authentication Module
```json
{
  "metadata": {
    "plannerVersion": "2.0.0",
    "generatedAt": "2026-06-21T10:00:00.000Z",
    "source": "planner-agent",
    "taskCount": 3,
    "assumptions": ["User database already exists"]
  },
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Implement Login Screen with Email and Password",
      "module": "AUTH",
      "priority": "P1",
      "status": "todo",
      "dependencies": [],
      "acceptanceCriteria": [
        "User can enter email and password",
        "Form validates email format and password length",
        "Error messages are displayed for invalid inputs"
      ],
      "definitionOfDone": [
        "Login screen renders correctly on mobile and desktop",
        "Form validation works for all edge cases",
        "Unit tests pass with 80%+ coverage"
      ],
      "estimate": "8h",
      "assignee": "coder",
      "milestoneId": "MS-001",
      "description": "Create a login screen that allows users to authenticate using email and password credentials.",
      "technicalNotes": "Use the existing form validation library. Follow the design system in the style guide."
    }
  ],
  "milestones": [
    {
      "id": "MS-001",
      "title": "Authentication Foundation",
      "description": "Core authentication features including login, registration, and password reset.",
      "tasks": ["TASK-001", "TASK-002", "TASK-003"],
      "targetDate": "2026-07-15",
      "status": "planned"
    }
  ],
  "risks": []
}
```

## Checklist
Before finalizing your output, verify:
- [ ] All tasks have unique IDs following TASK-{NNN} pattern
- [ ] All task titles are unique and descriptive (min 10 chars)
- [ ] All tasks have at least 3 acceptance criteria (each min 10 chars)
- [ ] All tasks have at least 2 definition of done items (each min 10 chars)
- [ ] All dependencies reference existing task IDs
- [ ] No circular dependencies exist
- [ ] No task depends on itself
- [ ] All tasks have valid estimates matching ^[0-9]+[mhdw]$
- [ ] All tasks have valid assignee roles
- [ ] At least one milestone exists
- [ ] Milestone task references match existing task IDs
- [ ] Risks are documented if applicable
- [ ] Assumptions are documented if requirements were ambiguous
```

## 5.3 architect.md

```markdown
# Architect Agent

## Identity
You are a Senior Software Architect with deep expertise in software architecture, design patterns, system design, and technology selection. You are the second agent in the PromptAgent workflow. You bridge the gap between planning and implementation by making architecture decisions.

## Objectives
- Analyze planner output for architectural implications
- Make architecture decisions and document them as ADRs
- Map each task to relevant architecture decisions
- Provide implementation guidance for each task
- Identify architecture-level risks
- Update architecture documentation

## Inputs
- `planner-output.json` — Task breakdown from Planner Agent
- `project.json` — Project metadata, type, phase
- `docs/requirements.md` — Business requirements
- `docs/features.md` — Feature specifications
- `docs/architecture.md` — Current architecture documentation
- `context/tech-stack.md` — Technology stack
- `context/coding-rules.md` — Coding standards
- `context/architecture-rules.md` — Architecture rules and constraints
- `memory/memory-summary.json` — Previous architecture decisions and context
- `memory/memory.json` — Full memory for detailed context

## Outputs
You must produce a valid `architect-output.json` file following `schemas/outputs/architect-output.schema.json`.

Required fields:
- `metadata.architectVersion` — Version of the architect agent
- `metadata.generatedAt` — ISO 8601 timestamp
- `metadata.adrCount` — Number of ADRs created
- `decisions[]` — Array of ADR objects, each with:
  - `adrId` — Pattern: ADR-{NNN} (e.g., ADR-001)
  - `title` — Descriptive title (min 10 characters)
  - `context` — Context and forces (min 20 characters)
  - `decision` — The decision itself (min 20 characters)
  - `consequences` — Positive and negative consequences (min 20 characters)
  - `alternatives[]` — Alternatives considered (optional)
  - `status` — "proposed" or "accepted"
  - `relatedTasks[]` — Task IDs this ADR applies to
- `architectureUpdates[]` — Files to update with architecture content
- `taskAssignments[]` — Task-to-architecture mapping with implementation guidance
- `risks[]` — Architecture-level risks (optional)

## Constraints
1. Do NOT make architecture decisions that contradict existing ADRs without explicitly superseding them
2. Do NOT create ADRs for trivial implementation details
3. Do NOT assign tasks to architecture decisions that don't need them
4. Keep ADRs focused on significant architectural choices
5. Follow the project's existing architecture patterns unless there is a compelling reason to change

## Quality Rules
1. Every ADR must have clear context, decision, and consequences
2. Every task must have at least one ADR reference
3. ADR titles should follow the pattern "ADR-{NNN}: {Decision Title}"
4. Architecture updates should be specific and actionable
5. Implementation guidance should reference specific files and patterns

## Failure Handling
1. If requirements conflict: Document trade-offs in the ADR
2. If technology choice is unclear: Recommend with rationale and document alternatives
3. If planner output is invalid: Flag the issue and request clarification from Planner
4. If architecture cannot be determined: Escalate to human with specific questions

## Handoff Rules
- **Receive from:** Planner Agent (via planner-output.json)
- **Send to:** Coder Agent
- **Handoff artifact:** `architect-output.json`
- **Handoff validation:** The handoff validator will check:
  1. All ADRs have valid IDs and required fields
  2. Every task has at least one ADR reference
  3. ADR status is valid
  4. Architecture updates reference existing files
- **On validation failure:** You will receive structured feedback. Fix the issues and regenerate. Maximum 3 retries before escalation.

## Examples
[2-3 examples of valid architect output]

## Checklist
- [ ] All ADRs have unique IDs following ADR-{NNN} pattern
- [ ] All ADRs have context, decision, and consequences (each min 20 chars)
- [ ] Every task in planner output has at least one ADR reference
- [ ] ADR status is "proposed" or "accepted"
- [ ] Architecture updates reference files that exist
- [ ] Implementation guidance is specific and actionable
- [ ] Risks are documented if applicable
- [ ] No ADR contradicts existing active ADRs without superseding them
```

## 5.4 coder.md

```markdown
# Coder Agent

## Identity
You are a Senior Software Engineer with deep expertise in full-stack development, clean code, testing, and following architecture guidelines. You are the third agent in the PromptAgent workflow. You implement tasks according to architecture decisions.

## Objectives
- Implement the assigned task following architecture decisions
- Write clean, tested, production-ready code
- Follow coding standards and conventions
- Verify acceptance criteria are met
- Update memory with implementation details

## Inputs
- `project.json` — Project metadata, type, phase
- `tasks/current-task.json` — The task to implement
- `tasks/tasks.json` — Full task list for context
- `architect-output.json` — Architecture decisions and implementation guidance
- `docs/architecture.md` — Architecture documentation
- `context/tech-stack.md` — Technology stack
- `context/coding-rules.md` — Coding standards
- `context/architecture-rules.md` — Architecture rules
- `context/testing-rules.md` — Testing requirements
- `memory/memory-summary.json` — Previous decisions and context
- `memory/memory.json` — Full memory for detailed context
- Project source files — Existing codebase

## Outputs
You must produce a valid `coder-output.json` file following `schemas/outputs/coder-output.schema.json`.

Required fields:
- `metadata.coderVersion` — Version of the coder agent
- `metadata.generatedAt` — ISO 8601 timestamp
- `metadata.taskId` — The task being implemented
- `filesChanged[]` — Array of file changes, each with:
  - `path` — File path
  - `changeType` — "created", "modified", or "deleted"
  - `summary` — Summary of changes (min 10 characters)
- `testResults` — Test execution results
  - `total` — Total tests
  - `passed` — Tests passed
  - `failed` — Tests failed
  - `skipped` — Tests skipped
- `lintResults` — Lint results (optional)
- `memoryUpdates[]` — Memory records to create
- `acceptanceVerification[]` — Verification of each acceptance criterion
- `decisions[]` — Decisions made during implementation

## Constraints
1. Do NOT modify files outside the scope of the current task
2. Do NOT change architecture without explicit approval
3. Do NOT delete files without documenting the reason
4. Do NOT introduce new dependencies without documenting the rationale
5. Follow the project's coding standards and conventions
6. Write tests for all new code

## Quality Rules
1. All tests must pass before marking task as complete
2. Lint must pass with zero errors
3. All acceptance criteria must be verified
4. Code must follow the project's architecture decisions
5. Memory must be updated with implementation decisions and any bugs found
6. Code should be reviewed for security vulnerabilities

## Failure Handling
1. If architecture decision is unclear: Flag for Architect and document the question
2. If task is blocked by external factors: Document the blocker and set task status to "blocked"
3. If tests fail: Fix the code, don't modify tests to pass
4. If requirements are ambiguous: Document assumptions and proceed

## Handoff Rules
- **Receive from:** Architect Agent (via architect-output.json)
- **Send to:** Reviewer Agent
- **Handoff artifact:** `coder-output.json`
- **Handoff validation:** The handoff validator will check:
  1. All tests pass (failed === 0)
  2. Lint passes (errors === 0)
  3. All acceptance criteria are verified
  4. At least one memory update is proposed
- **On validation failure:** You will receive structured feedback. Fix the issues and regenerate. Maximum 3 retries before escalation.

## Examples
[2-3 examples of valid coder output]

## Checklist
- [ ] Code compiles successfully
- [ ] All tests pass
- [ ] Lint passes with zero errors
- [ ] All acceptance criteria are verified with evidence
- [ ] Memory updates are proposed for decisions, conventions, and bugs
- [ ] Files changed are documented with summaries
- [ ] No files outside task scope were modified
- [ ] Architecture decisions were followed
- [ ] Security best practices were followed
```

## 5.5 reviewer.md

```markdown
# Reviewer Agent

## Identity
You are a Senior Code Reviewer with expertise in code quality, security, performance, and best practices. You are the fourth agent in the PromptAgent workflow. You review code produced by the Coder Agent and ensure it meets quality standards.

## Objectives
- Review code for correctness, security, performance, and style
- Verify acceptance criteria are met
- Identify bugs, vulnerabilities, and code quality issues
- Classify issues by severity
- Make pass/fail decision with clear rationale

## Inputs
- `coder-output.json` — Coder's output with file changes and test results
- `tasks/current-task.json` — The task that was implemented
- `architect-output.json` — Architecture decisions for context
- `docs/architecture.md` — Architecture documentation
- `context/coding-rules.md` — Coding standards
- `context/testing-rules.md` — Testing requirements
- `context/security-rules.md` — Security requirements
- Project source files — The actual code changes

## Outputs
You must produce a valid `reviewer-output.json` file following `schemas/outputs/reviewer-output.schema.json`.

Required fields:
- `metadata.reviewerVersion` — Version of the reviewer agent
- `metadata.generatedAt` — ISO 8601 timestamp
- `metadata.taskId` — The task being reviewed
- `decision` — "approved", "changes-requested", or "rejected"
- `reviewItems[]` — Array of review findings, each with:
  - `category` — "correctness", "security", "performance", "style", "test-coverage", "architecture-compliance", "acceptance-criteria"
  - `severity` — "P0-blocker", "P1-critical", "P2-major", "P3-minor", "P4-suggestion"
  - `description` — Description of the finding (min 10 characters)
  - `location` — File and line number if applicable
  - `actionable` — Whether action is required
  - `suggestion` — Suggested fix (optional)
- `acceptanceVerification[]` — Independent verification of acceptance criteria
- `summary` — Overall review summary (min 20 characters)
- `memoryUpdates[]` — Memory records to create (bugs found, conventions noted)

## Constraints
1. Do NOT approve code that has P0 or P1 issues
2. Do NOT reject code without providing actionable feedback
3. Do NOT make assumptions about intent — verify against acceptance criteria
4. Be constructive and specific in feedback

## Quality Rules
1. Every review item must have a severity classification
2. P0-blocker: Security vulnerability, data loss, system crash
3. P1-critical: Incorrect behavior, major performance issue, architecture violation
4. P2-major: Code quality issue, missing test coverage, minor performance issue
5. P3-minor: Style issue, documentation gap, minor refactoring opportunity
6. P4-suggestion: Improvement idea, best practice recommendation
7. Decision must be consistent with severity: P0-P1 items require changes-requested or rejected

## Failure Handling
1. If code is incomplete: Reject with specific list of missing items
2. If tests are missing: Flag as P2-major and request tests
3. If security issues are found: Flag as P0-blocker and reject
4. If architecture violations are found: Flag as P1-critical and request changes

## Handoff Rules
- **Receive from:** Coder Agent (via coder-output.json)
- **Send to:** Coder Agent (if changes requested) or mark task as done
- **Handoff artifact:** `reviewer-output.json`
- **Handoff validation:** The handoff validator will check:
  1. If approved: No P0-P1 items exist
  2. If changes-requested: At least one P0-P2 item exists
  3. If rejected: At least one P0-blocker item exists
  4. All review items have severity classification
- **On approval:** Task is marked done, memory is updated, next task is selected
- **On changes-requested:** Task status is set to "in_progress", feedback is sent to Coder
- **On rejection:** Task status is set to "blocked", escalation is triggered

## Examples
[2-3 examples of valid reviewer output]

## Checklist
- [ ] All acceptance criteria are independently verified
- [ ] Code correctness is verified
- [ ] Security vulnerabilities are checked
- [ ] Performance implications are considered
- [ ] Architecture compliance is verified
- [ ] Test coverage is adequate
- [ ] Coding standards are followed
- [ ] Review items have clear severity classification
- [ ] Decision is consistent with findings
- [ ] Memory updates are proposed for bugs and conventions found
```

## 5.6 debugger.md

```markdown
# Debugger Agent

## Identity
You are a Senior Debugging Engineer with expertise in root cause analysis, systematic debugging, and minimal-risk fixes. You are the fifth agent in the PromptAgent workflow. You investigate and fix bugs reported by humans, reviewers, or automated systems.

## Objectives
- Perform root cause analysis on reported bugs
- Classify bugs by severity
- Propose and implement fixes
- Verify fixes don't introduce regressions
- Document findings in memory

## Inputs
- `debugger-input.json` — Bug report following `schemas/contracts/debugger-input.schema.json`
- `project.json` — Project metadata
- `memory/memory.json` — Previous bugs and fixes for context
- Project source files — The codebase to debug

## Outputs
You must produce a valid `debugger-output.json` file following `schemas/outputs/debugger-output.schema.json`.

Required fields:
- `metadata.debuggerVersion` — Version of the debugger agent
- `metadata.generatedAt` — ISO 8601 timestamp
- `metadata.inputSource` — Source of the bug report
- `rootCauseAnalysis` — RCA with:
  - `symptoms` — Observed symptoms
  - `rootCause` — Identified root cause (min 20 characters)
  - `impact` — Impact assessment
- `fixDescription` — Description of the fix (min 20 characters)
- `filesChanged[]` — Files modified to apply the fix
- `verificationSteps` — Steps to verify the fix
- `regressionRisk` — Assessment of regression risk
- `memoryUpdates[]` — Bug record to write to memory

## Constraints
1. Do NOT fix symptoms — fix root causes
2. Do NOT introduce new features while debugging
3. Do NOT modify unrelated code
4. Minimize side effects of fixes
5. Always verify the fix doesn't break existing tests

## Quality Rules
1. RCA must identify the actual root cause, not just the symptom
2. Fix must minimize side effects
3. Verification steps must be reproducible
4. Regression risk must be assessed
5. Bug record must be written to memory with severity classification

## Failure Handling
1. If bug cannot be reproduced: Document the environment and steps tried
2. If root cause cannot be identified: Document hypotheses and recommend monitoring
3. If fix introduces regressions: Roll back and try alternative approach
4. If bug is in third-party code: Document workaround and escalate

## Handoff Rules
- **Receive from:** Human, Reviewer Agent, or automated system
- **Send to:** Memory System (bug record) and optionally Coder Agent (if fix requires code changes)
- **Handoff artifact:** `debugger-output.json`
- **Handoff validation:** The handoff validator will check:
  1. RCA has identified root cause
  2. Fix description is specific and verifiable
  3. Verification steps are reproducible
  4. Bug record is proposed for memory
- **On validation failure:** You will receive structured feedback. Fix the issues and regenerate. Maximum 3 retries before escalation.

## Examples
[2-3 examples of valid debugger output]

## Checklist
- [ ] Root cause is identified, not just symptoms
- [ ] Fix addresses the root cause
- [ ] Fix minimizes side effects
- [ ] Verification steps are reproducible
- [ ] Regression risk is assessed
- [ ] Existing tests still pass
- [ ] Bug record is written to memory with severity
- [ ] If fix requires code changes, files are documented
```

---

# Part 6 — Phase Gate System

## 6.1 phase-gates.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Phase Gates Schema",
  "type": "object",
  "required": ["schemaVersion", "phases"],
  "properties": {
    "schemaVersion": { "type": "string", "enum": ["1.0.0"] },
    "phases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["phase", "name", "entryCriteria", "exitCriteria"],
        "properties": {
          "phase": { "type": "integer", "minimum": 1, "maximum": 10 },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "entryCriteria": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "description", "validationType"],
              "properties": {
                "id": { "type": "string" },
                "description": { "type": "string" },
                "validationType": { "type": "string", "enum": ["file-exists", "schema-valid", "content-quality", "count-min", "custom"] },
                "params": { "type": "object" }
              }
            }
          },
          "exitCriteria": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "description", "validationType"],
              "properties": {
                "id": { "type": "string" },
                "description": { "type": "string" },
                "validationType": { "type": "string", "enum": ["file-exists", "schema-valid", "content-quality", "count-min", "custom"] },
                "params": { "type": "object" }
              }
            }
          }
        }
      }
    }
  }
}
```

## 6.2 Phase Definitions

### Phase 1 — Project Initialization

| Aspect | Details |
|--------|---------|
| **Name** | Project Initialization |
| **Description** | Create project structure, initialize metadata, set up documentation templates |
| **Entry Criteria** | None (starting phase) |
| **Exit Criteria** | |
| EC-1.1 | `project.json` exists and is schema-valid |
| EC-1.2 | All required docs exist: `requirements.md`, `features.md`, `architecture.md` |
| EC-1.3 | All context files exist: `tech-stack.md`, `coding-rules.md`, `architecture-rules.md`, `testing-rules.md`, `security-rules.md`, `ai-rules.md` |
| EC-1.4 | `tasks/tasks.json` exists and is schema-valid |
| EC-1.5 | `tasks/current-task.json` exists |
| EC-1.6 | `tasks/milestones.json` exists |
| EC-1.7 | `memory/memory.json` exists and is schema-valid |
| EC-1.8 | `memory/memory-summary.json` exists |
| EC-1.9 | Validation score >= 60 |

### Phase 2 — Requirements Definition

| Aspect | Details |
|--------|---------|
| **Name** | Requirements Definition |
| **Description** | Define business requirements, features, and user stories |
| **Entry Criteria** | Phase 1 exit criteria met |
| **Exit Criteria** | |
| EC-2.1 | `requirements.md` has problem statement (min 100 chars) |
| EC-2.2 | `requirements.md` has target users defined |
| EC-2.3 | `requirements.md` has goals and non-goals |
| EC-2.4 | `features.md` has at least 3 features with descriptions |
| EC-2.5 | Each feature has at least 3 acceptance criteria |
| EC-2.6 | Content quality score >= 50 for requirements.md and features.md |
| EC-2.7 | Validation score >= 70 |

### Phase 3 — Architecture Design

| Aspect | Details |
|--------|---------|
| **Name** | Architecture Design |
| **Description** | Define architecture, tech stack, data model, API contracts |
| **Entry Criteria** | Phase 2 exit criteria met |
| **Exit Criteria** | |
| EC-3.1 | `architecture.md` has architecture style defined |
| EC-3.2 | `architecture.md` has layers defined |
| EC-3.3 | `architecture.md` has folder structure defined |
| EC-3.4 | `tech-stack.md` has all sections filled (frontend, backend, database, CI/CD, cloud, monitoring) |
| EC-3.5 | At least 1 ADR exists in memory |
| EC-3.6 | Content quality score >= 50 for architecture.md and tech-stack.md |
| EC-3.7 | Validation score >= 75 |

### Phase 4 — Task Planning

| Aspect | Details |
|--------|---------|
| **Name** | Task Planning |
| **Description** | Break down work into tasks, define dependencies, create milestones |
| **Entry Criteria** | Phase 3 exit criteria met |
| **Exit Criteria** | |
| EC-4.1 | At least 5 tasks exist in `tasks/tasks.json` |
| EC-4.2 | All tasks have acceptance criteria (min 1 each) |
| EC-4.3 | All tasks have definition of done (min 1 each) |
| EC-4.4 | All tasks have valid estimates |
| EC-4.5 | Task dependencies form a DAG (no cycles) |
| EC-4.6 | At least 1 milestone exists in `milestones.json` |
| EC-4.7 | All milestone task references are valid |
| EC-4.8 | Validation score >= 80 |

### Phase 5 — Agent Setup

| Aspect | Details |
|--------|---------|
| **Name** | Agent Setup |
| **Description** | Configure agent prompts, handoff contracts, and validation gates |
| **Entry Criteria** | Phase 4 exit criteria met |
| **Exit Criteria** | |
| EC-5.1 | All role prompts exist and are 50+ lines with all 10 sections |
| EC-5.2 | All handoff contracts exist in `schemas/contracts/` |
| EC-5.3 | All agent output schemas exist in `schemas/outputs/` |
| EC-5.4 | Agent state machine is implemented |
| EC-5.5 | Quality gates are implemented for all transitions |
| EC-5.6 | Phase gate validator is implemented |
| EC-5.7 | Content validator is implemented |
| EC-5.8 | Validation score >= 85 |

### Phase 6 — Planner Agent

| Aspect | Details |
|--------|---------|
| **Name** | Planner Agent |
| **Description** | Planner agent generates task breakdowns, validates output, imports tasks |
| **Entry Criteria** | Phase 5 exit criteria met |
| **Exit Criteria** | |
| EC-6.1 | Planner prompt has been used to generate at least 1 valid planner output |
| EC-6.2 | Planner output passed all validation rules |
| EC-6.3 | Planner output was successfully imported into tasks |
| EC-6.4 | Planner feedback loop works (invalid output → feedback → correction) |
| EC-6.5 | Memory was updated with planner decisions |
| EC-6.6 | Validation score >= 90 |

### Phase 7 — Coder Agent

| Aspect | Details |
|--------|---------|
| **Name** | Coder Agent |
| **Description** | Coder agent implements tasks following architecture decisions |
| **Entry Criteria** | Phase 6 exit criteria met |
| **Exit Criteria** | |
| EC-7.1 | At least 3 tasks have been completed by the coder agent |
| EC-7.2 | All completed tasks have passing tests |
| EC-7.3 | All completed tasks have passing lint |
| EC-7.4 | All completed tasks have acceptance criteria verified |
| EC-7.5 | Memory was updated with implementation decisions |
| EC-7.6 | Coder→Reviewer handoff works correctly |
| EC-7.7 | Validation score >= 90 |

### Phase 8 — Reviewer Agent

| Aspect | Details |
|--------|---------|
| **Name** | Reviewer Agent |
| **Description** | Reviewer agent reviews code, verifies quality, manages approvals |
| **Entry Criteria** | Phase 7 exit criteria met |
| **Exit Criteria** | |
| EC-8.1 | At least 3 code reviews have been completed |
| EC-8.2 | Review items have severity classification |
| EC-8.3 | Approved tasks are marked done correctly |
| EC-8.4 | Rejected tasks trigger correct escalation |
| EC-8.5 | Memory was updated with bugs and conventions found |
| EC-8.6 | Reviewer→Coder feedback loop works correctly |
| EC-8.7 | Validation score >= 95 |

---

# Part 7 — Agent Lifecycle

## 7.1 State Machine

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
              ┌──────────┐    assign    ┌──────────┐             │
              │   IDLE   │─────────────→│  ACTIVE  │             │
              └──────────┘              └──────────┘             │
                                             │                    │
                                    ┌────────┼────────┐          │
                                    │        │        │          │
                                    ▼        ▼        ▼          │
                              ┌────────┐ ┌────────┐ ┌────────┐  │
                              │BLOCKED │ │COMPLETED│ │ FAILED │  │
                              └────────┘ └────────┘ └────────┘  │
                                    │        │        │          │
                                    │        ▼        │          │
                                    │  ┌──────────┐   │          │
                                    └─→│ REVIEW   │   │          │
                                       └──────────┘   │          │
                                            │          │          │
                                    ┌───────┼───┐      │          │
                                    │       │   │      │          │
                                    ▼       ▼   ▼      ▼          │
                              ┌────────┐ ┌────────┐ ┌────────┐   │
                              │APPROVED│ │CHANGES │ │ESCALATED│   │
                              │        │ │REQUEST │ │         │   │
                              └────────┘ └────────┘ └────────┘   │
                                             │                    │
                                             └────────────────────┘
```

## 7.2 State Definitions

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| **IDLE** | Agent is available but not assigned to any work | → ACTIVE |
| **ACTIVE** | Agent is working on assigned work | → BLOCKED, → COMPLETED, → FAILED |
| **BLOCKED** | Agent cannot proceed due to external dependency | → ACTIVE (unblocked), → ESCALATED |
| **COMPLETED** | Agent has finished work and is awaiting review | → REVIEW |
| **REVIEW** | Agent's output is being reviewed | → APPROVED, → CHANGES_REQUESTED, → FAILED |
| **APPROVED** | Agent's output has been approved, work is done | → IDLE (next agent starts) |
| **CHANGES_REQUESTED** | Agent needs to revise output based on feedback | → ACTIVE |
| **FAILED** | Agent encountered an unrecoverable error | → IDLE (reset), → ESCALATED |
| **ESCALATED** | Issue requires human intervention | → IDLE (after human resolves) |

## 7.3 Transition Rules

| From | To | Guard Condition |
|------|----|-----------------|
| IDLE | ACTIVE | Agent is assigned to a task |
| ACTIVE | BLOCKED | External dependency not met, or input invalid |
| ACTIVE | COMPLETED | Work is done, output is ready for review |
| ACTIVE | FAILED | Unrecoverable error, max retries exceeded |
| BLOCKED | ACTIVE | Blocking dependency is resolved |
| BLOCKED | ESCALATED | Blocked for > N hours (configurable) |
| COMPLETED | REVIEW | Output is submitted for review |
| REVIEW | APPROVED | All quality gates pass, no P0-P1 issues |
| REVIEW | CHANGES_REQUESTED | Quality issues found, P0-P2 items exist |
| REVIEW | FAILED | Output is fundamentally invalid |
| CHANGES_REQUESTED | ACTIVE | Agent receives feedback and resumes work |
| FAILED | IDLE | Agent is reset for a new attempt |
| FAILED | ESCALATED | Max retries exceeded, needs human intervention |
| ESCALATED | IDLE | Human resolves the issue and resets the agent |

## 7.4 Retry Handling

| Parameter | Value | Description |
|-----------|-------|-------------|
| Max retries | 3 | Maximum number of times an agent can retry after changes-requested or failed |
| Retry backoff | Exponential (1min, 5min, 30min) | Wait time between retries |
| Retry reset | After successful completion | Retry count resets when agent completes successfully |
| Escalation trigger | Max retries exceeded | When retries are exhausted, escalate to human |

## 7.5 Rejection Handling

| Rejection Type | Action | Feedback Required |
|----------------|--------|-------------------|
| Changes requested (P0-P2) | Set task to "in_progress", send feedback to agent | Yes — specific items with severity |
| Rejected (P0-blocker) | Set task to "blocked", escalate | Yes — specific blockers with evidence |
| Failed validation | Set task to "failed", increment retry count | Yes — validation errors with locations |

---

# Part 8 — Quality Gates

## 8.1 Quality Gate Architecture

Each quality gate is a function that:
1. Receives the handoff artifact (agent output)
2. Runs specific checks against the artifact
3. Returns pass/fail with detailed results
4. On fail: Generates structured feedback for the source agent

## 8.2 Planner → Architect Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-PA-1 | Schema validation | planner-output.json is valid against planner-output.schema.json | Return schema errors with locations |
| QG-PA-2 | Task completeness | All tasks have acceptanceCriteria (min 1) and definitionOfDone (min 1) | Return list of incomplete tasks |
| QG-PA-3 | Dependency integrity | No circular dependencies, no self-dependencies, all refs exist | Return dependency errors with cycle paths |
| QG-PA-4 | Milestone coverage | At least 1 milestone exists, all task refs are valid | Return missing milestone or invalid refs |
| QG-PA-5 | Estimate validity | All estimates match ^[0-9]+[mhdw]$ pattern | Return invalid estimates with corrections |
| QG-PA-6 | Title uniqueness | No duplicate task titles (case-insensitive) | Return duplicate titles |

## 8.3 Architect → Coder Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-AC-1 | Schema validation | architect-output.json is valid against architect-output.schema.json | Return schema errors with locations |
| QG-AC-2 | ADR completeness | All ADRs have context, decision, consequences (min 20 chars each) | Return incomplete ADRs |
| QG-AC-3 | Task coverage | Every task in planner output has at least 1 ADR reference | Return uncovered tasks |
| QG-AC-4 | ADR uniqueness | No duplicate ADR IDs or titles | Return duplicates |
| QG-AC-5 | Implementation guidance | Every task has implementation guidance (min 20 chars) | Return tasks without guidance |
| QG-AC-6 | Architecture risk documentation | Risks are documented if architecture has significant trade-offs | Return warning if risks missing |

## 8.4 Coder → Reviewer Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-CR-1 | Schema validation | coder-output.json is valid against coder-output.schema.json | Return schema errors with locations |
| QG-CR-2 | Test results | All tests pass (failed === 0) | Return failed tests with details |
| QG-CR-3 | Lint results | Lint passes (errors === 0) | Return lint errors with locations |
| QG-CR-4 | Acceptance criteria verification | All acceptance criteria are verified (verified === true) | Return unverified criteria |
| QG-CR-5 | Memory updates | At least 1 memory update is proposed | Return warning that memory is not updated |
| QG-CR-6 | File change documentation | All changed files are documented with summaries | Return undocumented changes |

## 8.5 Reviewer → Coder Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-RC-1 | Schema validation | reviewer-output.json is valid against reviewer-output.schema.json | Return schema errors |
| QG-RC-2 | Severity classification | All review items have severity | Return items without severity |
| QG-RC-3 | Decision consistency | Decision matches severity: approved → no P0-P1, changes-requested → P0-P2 exist, rejected → P0-blocker exists | Return inconsistency explanation |
| QG-RC-4 | Actionable feedback | All P0-P2 items are actionable (actionable === true) | Return non-actionable items |
| QG-RC-5 | Acceptance verification | All acceptance criteria are independently verified | Return unverified criteria |
| QG-RC-6 | Memory updates | Bugs and conventions found are proposed for memory | Return warning if memory not updated |

## 8.6 Reviewer → Completed Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-RD-1 | Approval decision | Decision is "approved" | Cannot proceed without approval |
| QG-RD-2 | No P0-P1 items | No P0-blocker or P1-critical items remain | Return items that must be resolved |
| QG-RD-3 | Task status update | Task status is set to "done" | Return status update error |
| QG-RD-4 | Memory update | Completed task record is written to memory | Return memory update error |
| QG-RD-5 | Next task selection | Next available task is selected (if any) | Return next task selection error |

## 8.7 Debugger → Memory Gate

| Gate | Check | Pass Condition | Fail Action |
|------|-------|---------------|-------------|
| QG-DM-1 | Schema validation | debugger-output.json is valid against debugger-output.schema.json | Return schema errors |
| QG-DM-2 | RCA quality | Root cause is identified (min 20 chars) | Return incomplete RCA |
| QG-DM-3 | Fix description | Fix is described (min 20 chars) | Return incomplete fix description |
| QG-DM-4 | Verification steps | Verification steps are reproducible | Return non-reproducible steps |
| QG-DM-5 | Bug record | Bug record is proposed for memory with severity | Return missing bug record |
| QG-DM-6 | Regression assessment | Regression risk is assessed | Return missing regression assessment |

---

# Part 9 — Future-Proof Architecture

## 9.1 What Should Be Redesigned Now (Before Phase 6)

| Component | Current State | Target State | Rationale |
|-----------|--------------|--------------|-----------|
| **Memory Schema** | Schema-less arrays | Item-level schemas with required fields | Memory integrity is foundational — without it, no agent can trust the system's knowledge |
| **Agent Contracts** | Non-existent | 5 handoff contracts as JSON schemas | Agent coordination is impossible without formal contracts |
| **Role Prompts** | 4-8 lines each | 50+ lines with 10 sections each | LLM agents need structured guidance to produce consistent output |
| **Phase Gates** | Non-existent | 8 phase definitions with entry/exit criteria | Workflow progression must be enforced, not cosmetic |
| **Agent State Machine** | Non-existent | 9-state machine with transitions and guards | Agent lifecycle must be managed for autonomous operation |
| **Quality Gates** | Only planner gate exists | 7 quality gate sets for all transitions | Defective output must be caught before it propagates |
| **Architect Agent** | Non-existent | Full agent with prompt, schema, ADR management | Missing link in the agent pipeline |
| **Content Validation** | >50 char check only | Placeholder detection + section scoring | Empty templates must not pass validation |
| **Task Schema** | acceptanceCriteria optional | acceptanceCriteria required | Tasks must have measurable completion criteria |
| **Audit Trail** | Non-existent | Append-only audit log | Multi-agent systems must be auditable |

## 9.2 What Can Wait Until Phase 7

| Component | Why It Can Wait |
|-----------|-----------------|
| **Plugin System** | Phase 6 can work with built-in components. Plugin system becomes important when third parties need to extend the framework. |
| **Prompt Template Engine** | Static prompts are acceptable for Phase 6. Dynamic composition becomes important when prompts need to adapt to diverse project contexts. |
| **Memory Compaction** | Phase 6 will not generate enough memory to require compaction. This becomes critical after 100+ completed tasks. |
| **Critical Path Analysis** | Phase 6 can work with basic dependency validation. Advanced analysis becomes important for complex project scheduling. |
| **Task Dependency Visualization** | Text-based graph is nice-to-have but not essential for Phase 6 operation. |
| **Bulk Task Operations** | Single-task CRUD is sufficient for Phase 6. Bulk operations improve efficiency for large projects. |

## 9.3 What Can Wait Until Phase 8

| Component | Why It Can Wait |
|-----------|-----------------|
| **Security Model (RBAC)** | Phase 6 operates in a trusted single-developer environment. RBAC becomes critical when the framework is exposed to untrusted agents or users. |
| **Schema Version Migration** | Phase 6 uses a single schema version. Migration becomes necessary when schemas evolve over time with existing projects. |
| **Agent Output Versioning** | Versioning and diff become important when multiple iterations of agent output need to be compared. |
| **Interactive Dashboard** | CLI-based operation is sufficient for Phase 6. Dashboard is a UX improvement, not a functional requirement. |
| **Distributed Agent Communication** | All agents run on the same machine in Phase 6. Network communication becomes necessary when agents run on different machines. |

## 9.4 Scalability Assumptions

| Scale Factor | Phase 6 | Phase 7 | Phase 8 | Future |
|-------------|---------|---------|---------|--------|
| Projects | 1-5 | 5-20 | 20-50 | 100+ |
| Tasks per project | 5-20 | 20-100 | 100-500 | 500-10,000 |
| Agents | 1 (Planner) | 3 (Planner, Architect, Coder) | 5 (all) | 10+ (custom) |
| Memory records | 10-50 | 50-500 | 500-5,000 | 5,000-50,000 |
| Concurrent users | 1 | 1-3 | 3-10 | 10-100 |

## 9.5 Design Decisions for Longevity

| Decision | Rationale |
|----------|-----------|
| **JSON Schema for all data** | Schemas are self-documenting, versionable, and can be used for code generation |
| **File-based storage (JSON)** | For single-developer local use, JSON files are simpler than databases. Migration to SQLite is possible later without changing the schema layer |
| **Contract-driven handoffs** | Contracts make agent interactions explicit, testable, and evolvable |
| **Append-only audit log** | Append-only logs are the foundation of data integrity and forensic analysis |
| **Plugin architecture deferred** | Premature plugin abstraction adds complexity. Built-in components first, plugin API later |
| **State machine before agents** | Agent behavior must be predictable and recoverable. State machine provides this foundation |
| **Quality gates as separate validators** | Quality gates can be tested independently, composed flexibly, and extended without modifying agent code |

---

# Part 10 — Final Roadmap

## 10.1 Sprint Overview

```
Sprint 1: Memory & Schema Foundation (Week 1)
Sprint 2: Agent Contracts & Handoffs (Week 1-2)
Sprint 3: Role Prompt Rewrite (Week 2)
Sprint 4: Phase Gates & Architect Agent (Week 2-3)
Sprint 5: Agent Lifecycle & Integration (Week 3)
Sprint 6: Testing & Documentation (Week 3-4)
```

## 10.2 Sprint 1 — Memory & Schema Foundation

**Focus:** Fix memory integrity and schema gaps before any agent work

**Files to create:**
- `schemas/memory.schema.json` — Complete redesign with item-level schemas
- `schemas/adr.schema.json` — ADR schema with lifecycle
- `memory/memory-manager-v3.js` — Memory CRUD with schema validation
- `memory/memory-summarizer.js` — Summary generation with importance scoring
- `memory/memory-query.js` — Query interface
- `validation/memory-validator.js` — Updated to validate against item-level schemas

**Files to modify:**
- `schemas/task.schema.json` — Add acceptanceCriteria and definitionOfDone to required
- `scripts/task-utils-v2.js` — Update memory operations to use v3
- `scripts/memory-manager-v2.js` — Update to use v3 schemas

**Implementation order:**
1. Redesign `memory.schema.json` with all item-level schemas
2. Create `adr.schema.json`
3. Update `task.schema.json` with required fields
4. Implement `memory-manager-v3.js`
5. Implement `memory-summarizer.js`
6. Implement `memory-query.js`
7. Update `memory-validator.js`
8. Update dependent scripts

**Expected outcome:** Memory system with data integrity. All records have required fields. ADRs have a defined lifecycle. Tasks require acceptance criteria.

## 10.3 Sprint 2 — Agent Contracts & Handoffs

**Focus:** Define formal contracts between every agent pair

**Files to create:**
- `schemas/contracts/planner-to-architect.schema.json`
- `schemas/contracts/architect-to-coder.schema.json`
- `schemas/contracts/coder-to-reviewer.schema.json`
- `schemas/contracts/reviewer-to-coder.schema.json`
- `schemas/contracts/debugger-input.schema.json`
- `schemas/outputs/planner-output.schema.json` — Redesign with all required fields
- `schemas/outputs/architect-output.schema.json`
- `schemas/outputs/coder-output.schema.json`
- `schemas/outputs/reviewer-output.schema.json`
- `schemas/outputs/debugger-output.schema.json`
- `contracts/handoff-validator.js` — Generic handoff validator
- `contracts/quality-gates.js` — Quality gate checks
- `contracts/contract-registry.js` — Contract registry

**Files to modify:**
- `scripts/validate-planner-output.js` — Update to use new planner-output.schema.json
- `scripts/import-planner-output.js` — Update for new schema fields

**Implementation order:**
1. Redesign `planner-output.schema.json` with all required fields
2. Create `architect-output.schema.json`
3. Create `coder-output.schema.json`
4. Create `reviewer-output.schema.json`
5. Create `debugger-output.schema.json`
6. Create all 5 handoff contracts
7. Implement `handoff-validator.js`
8. Implement `quality-gates.js`
9. Implement `contract-registry.js`
10. Update planner pipeline scripts

**Expected outcome:** All agent handoffs have formal contracts. Every agent has a defined output schema. Quality gates exist for all transitions.

## 10.4 Sprint 3 — Role Prompt Rewrite

**Focus:** Complete rewrite of all role prompts with structured specifications

**Files to create/modify:**
- `prompts/planner.md` — Complete rewrite (50+ lines, 10 sections)
- `prompts/architect.md` — New file (50+ lines, 10 sections)
- `prompts/coder.md` — Complete rewrite (50+ lines, 10 sections)
- `prompts/reviewer.md` — Complete rewrite (50+ lines, 10 sections)
- `prompts/debugger.md` — Complete rewrite (50+ lines, 10 sections)

**Implementation order:**
1. Write `planner.md` with all 10 sections
2. Write `architect.md` with all 10 sections
3. Write `coder.md` with all 10 sections
4. Write `reviewer.md` with all 10 sections
5. Write `debugger.md` with all 10 sections
6. Review all prompts for consistency and cross-references

**Expected outcome:** All role prompts are 50+ lines with identity, objectives, inputs, outputs, constraints, quality rules, failure handling, handoff rules, examples, and checklists.

## 10.5 Sprint 4 — Phase Gates & Architect Agent

**Focus:** Implement phase gate system and create architect agent

**Files to create:**
- `schemas/phase-gates.schema.json` — Phase gate definitions
- `schemas/agent-state.schema.json` — Agent state machine schema
- `workflow/phase-gate-engine.js` — Phase progression with gate checks
- `validation/phase-gate-validator.js` — Phase gate validation
- `validation/content-validator.js` — Content quality scoring
- `agents/agent-state-machine.js` — State machine implementation
- `agents/agent-context.js` — Context propagation
- `agents/agent-registry.js` — Agent discovery
- `scripts/advance-phase.js` — CLI for phase advancement

**Files to modify:**
- `validation/validate-project-v2.js` — Integrate phase gate and content validation
- `schemas/project.schema.json` — Add phase transition history

**Implementation order:**
1. Create `phase-gates.schema.json` with all 8 phase definitions
2. Implement `phase-gate-engine.js`
3. Implement `phase-gate-validator.js`
4. Implement `content-validator.js`
5. Create `agent-state.schema.json`
6. Implement `agent-state-machine.js`
7. Implement `agent-context.js`
8. Implement `agent-registry.js`
9. Create `advance-phase.js`
10. Update `validate-project-v2.js`

**Expected outcome:** Phase progression is enforced with completion checklists. Content quality is validated. Agent state machine manages agent lifecycle. Context is propagated between agents.

## 10.6 Sprint 5 — Agent Lifecycle & Integration

**Focus:** Integrate all components into working multi-agent pipeline

**Files to create:**
- `workflow/planner-pipeline.js` — Generate → Validate → Feedback → Import
- `workflow/planner-feedback.js` — Structured feedback for planner correction
- `workflow/task-engine-v4.js` — Task engine with history and critical path
- `workflow/workflow-definitions.js` — Workflow definitions
- `validation/validate-agent-handoff.js` — Handoff validation integration
- `validation/quality-gates.js` — Quality gate execution integration

**Files to modify:**
- `scripts/generate-planner-prompt-v2.js` — Update for new prompt structure
- `scripts/import-planner-output.js` — Update for new schema
- `scripts/complete-task.js` — Integrate with agent state machine
- `scripts/rollback-task.js` — Integrate with agent state machine

**Implementation order:**
1. Implement `planner-feedback.js`
2. Implement `planner-pipeline.js`
3. Implement `task-engine-v4.js` with history tracking
4. Implement `workflow-definitions.js`
5. Implement `validate-agent-handoff.js`
6. Implement `quality-gates.js` execution
7. Update all CLI scripts for integration
8. End-to-end integration testing

**Expected outcome:** Complete multi-agent pipeline: Planner → Architect → Coder → Reviewer → Debugger. All handoffs are validated. Quality gates are enforced. Agent state is managed.

## 10.7 Sprint 6 — Testing & Documentation

**Focus:** Add test coverage and documentation for all components

**Files to create:**
- `tests/unit/validators/memory-validator.test.js`
- `tests/unit/validators/task-validator.test.js`
- `tests/unit/validators/dependency-validator.test.js`
- `tests/unit/validators/project-validator.test.js`
- `tests/unit/validators/phase-gate-validator.test.js`
- `tests/unit/validators/content-validator.test.js`
- `tests/unit/validators/handoff-validator.test.js`
- `tests/unit/memory/memory-manager.test.js`
- `tests/unit/memory/memory-summarizer.test.js`
- `tests/unit/agents/state-machine.test.js`
- `tests/unit/workflow/phase-gate-engine.test.js`
- `tests/integration/planner-pipeline.test.js`
- `tests/integration/task-lifecycle.test.js`
- `tests/integration/memory-lifecycle.test.js`
- `tests/integration/agent-handoff.test.js`
- `tests/fixtures/valid-project/` — Valid project fixture
- `tests/fixtures/invalid-project/` — Invalid project fixture
- `docs/architecture.md` — Architecture documentation
- `docs/agents.md` — Agent documentation
- `docs/contracts.md` — Contract documentation
- `docs/memory.md` — Memory documentation
- `docs/phases.md` — Phase documentation
- `docs/development.md` — Development guide

**Files to modify:**
- `package.json` — Add test scripts
- `Readme` — Update with new architecture

**Implementation order:**
1. Create test fixtures
2. Write unit tests for all validators
3. Write unit tests for memory system
4. Write unit tests for agent state machine
5. Write unit tests for workflow engine
6. Write integration tests for all pipelines
7. Write architecture documentation
8. Write agent documentation
9. Write contract documentation
10. Write memory documentation
11. Write phase documentation
12. Write development guide
13. Update Readme
14. Update package.json with test scripts

**Expected outcome:** Comprehensive test suite with unit and integration tests. Complete documentation for all components. Framework is maintainable and extensible.

## 10.8 Summary

| Metric | Value |
|--------|-------|
| Total sprints | 6 |
| Total duration | 3-4 weeks |
| New files | 40+ |
| Modified files | 15+ |
| P0 items resolved | 7 |
| P1 items resolved | 8 |
| P2 items resolved | 7 |
| Phase 6 go-live | After Sprint 4 (week 2-3) |
| Phase 7 go-live | After Sprint 6 (week 3-4) + additional coder agent work |
| Phase 8 go-live | After Phase 7 + additional reviewer agent work |
| Target framework score | 75+ (from current 28) |

---

## Final Verdict

**B. FIX P0 ISSUES FIRST — then start Phase 6**

The PromptAgent framework has a solid foundation as a Prompt Framework but requires 3-4 weeks of foundational redesign before evolving into a multi-agent system. The 6-sprint roadmap provides a clear, incremental path to a production-grade framework that will support 100+ projects, 10,000+ tasks, and 5+ agent roles across 7+ technology stacks for years without major refactoring.

**The key insight:** Agent contracts and memory integrity are prerequisites for everything else. Without formal handoff contracts, agents cannot coordinate. Without trustworthy memory, agents cannot learn. These two foundations must be built before any agent-specific work begins. The roadmap prioritizes these foundations in Sprints 1-2, then builds agent capabilities on top in Sprints 3-6.