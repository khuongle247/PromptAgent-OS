# DEPRECATION POLICY — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** APPROVED  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. PURPOSE & PRINCIPLES

As PromptAgent transitions to a stable, production-ready framework (v1.x), maintaining backward compatibility is vital for downstream pipelines, custom agents, and enterprise integrations.

This Deprecation Policy guarantees **API stability** while providing a deterministic, predictable path for sunsetting legacy modules, duplicated scripts, and outdated interfaces without breaking active user workflows.

### Core Guarantees:

- **No breaking changes in v1.x:** Any interface designated as **PUBLIC** in `docs/API_CONTRACT.md` will remain supported throughout the entire v1.x lifecycle.
- **Graceful Migration Windows:** Deprecated modules or scripts will remain in the codebase for at least one minor release cycle (e.g., deprecated in v1.1.0, slated for removal in v2.0.0).
- **No Silent Removals:** All deprecations must be accompanied by code warnings, documentation updates, and migration guides.

---

## 2. RECOGNIZED LEGACY MODULES & SCRIPTS

During the Phase 9 consolidation, several legacy modules were superseded by modular, hardened v2/v3 variants. These items are officially designated as **DEPRECATED** and scheduled for removal in **v2.0.0**.

### 2.1. Script Mappings & Migration Path

| Deprecated Module/Script             | Superseded By                             | Migration Action Required                                         |
| :----------------------------------- | :---------------------------------------- | :---------------------------------------------------------------- |
| `scripts/init-project.js`            | `scripts/init-project-v2.js`              | Use `scripts/init-project-v2.js` or `npm run init-project`.       |
| `scripts/generate-prompt.js`         | `scripts/generate-prompt-v3.js`           | Use `scripts/generate-prompt-v3.js` or `npm run generate-prompt`. |
| `scripts/validate-project.js`        | `scripts/validate-project-v2.js`          | Use `validate-project-v2.js` or `npm run validate-project`.       |
| `scripts/task-engine.js`             | `scripts/task-engine-v3.js`               | Replace with `task-engine-v3.js`.                                 |
| `scripts/task-utils.js`              | `scripts/task-utils-v2.js`                | Require `task-utils-v2.js` instead.                               |
| `scripts/memory-manager.js`          | `scripts/memory-manager-v2.js`            | Use `memory-manager-v2.js`.                                       |
| `scripts/validate-planner-output.js` | `workflow/unified-validation-pipeline.js` | Use `run.js` entrypoint.                                          |
| `scripts/import-planner-output.js`   | `workflow/unified-validation-pipeline.js` | Use `run.js` entrypoint.                                          |

---

## 3. DEPRECATION & SUNSET PROCESS

```
1. Identify & Classify (ADR) -> 2. Instrument Warnings -> 3. Document -> 4. Remove (v2.0.0)
```

### Stage 1: ADR Submission

An Architectural Decision Record proposing the deprecation, mapping dependency impact.

### Stage 2: Console Warnings

Deprecated scripts emit warnings to stderr before removal.

### Stage 3: Documentation

JSDoc `@deprecated` tags and updates to CHANGELOG.md.

### Stage 4: Physical Removal

Only upon v2.0.0 major version transition.

---

## 4. COMPATIBILITY GUARANTEES

### 4.1. Storage Schema Backward-Compatibility

The `adapters/legacy-adapter.js` ensures projects created under v1.0.0 upgrade seamlessly.

### 4.2. Configuration Schemas

Schema properties in `schemas/` will not be renamed or removed during v1.x. Only optional keys may be added.

# DEPRECATION POLICY — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** APPROVED  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. PURPOSE & PRINCIPLES

As PromptAgent transitions to a stable, production-ready framework (v1.x), maintaining backward compatibility is vital for downstream pipelines, custom agents, and enterprise integrations.

This Deprecation Policy guarantees **API stability** while providing a deterministic, predictable path for sunsetting legacy modules, duplicated scripts, and outdated interfaces without breaking active user workflows.

### Core Guarantees:

- **No breaking changes in v1.x:** Any interface designated as **PUBLIC** in `docs/API_CONTRACT.md` will remain supported throughout the entire v1.x lifecycle.
- **Graceful Migration Windows:** Deprecated modules or scripts will remain in the codebase for at least one minor release cycle (e.g., deprecated in `v1.1.0`, slated for removal in `v2.0.0`) to give developers sufficient time to migrate.
- **No Silent Removals:** All deprecations must be accompanied by code warnings, documentation updates, and migration guides.

---

## 2. RECOGNIZED LEGACY MODULES & SCRIPTS

During the Phase 9 consolidation, several legacy modules were superseded by modular, hardened v2/v3 variants. These items are officially designated as **DEPRECATED** and scheduled for removal in **v2.0.0**.

### 2.1. Script Mappings & Migration Path

| Deprecated Module/Script             | Superseded By                             | Migration Action Required                                                                                    |
| :----------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `scripts/init-project.js`            | `scripts/init-project-v2.js`              | Update script invocations to use `scripts/init-project-v2.js` or standard `npm run init-project`.            |
| `scripts/generate-prompt.js`         | `scripts/generate-prompt-v3.js`           | Re-route custom prompt builders to `scripts/generate-prompt-v3.js` or `npm run generate-prompt`.             |
| `scripts/validate-project.js`        | `scripts/validate-project-v2.js`          | Migrate validation jobs to the schema-conforming `validate-project-v2.js` or `npm run validate-project`.     |
| `scripts/task-engine.js`             | `scripts/task-engine-v3.js`               | Replace manual invocations with `task-engine-v3.js` to ensure JSON compatibility.                            |
| `scripts/task-utils.js`              | `scripts/task-utils-v2.js`                | Update custom execution scripts that direct-load `require("./task-utils.js")` to require `task-utils-v2.js`. |
| `scripts/memory-manager.js`          | `scripts/memory-manager-v2.js`            | Use `memory-manager-v2.js` which integrates safely with modern event schemas.                                |
| `scripts/validate-planner-output.js` | `workflow/unified-validation-pipeline.js` | Direct checks must now leverage `unified-validation-pipeline.js` via the single entrypoint `run.js`.         |
| `scripts/import-planner-output.js`   | `workflow/unified-validation-pipeline.js` | Project generation is now fully integrated inside modern CLI hooks.                                          |

---

## 3. DEPRECATION & SUNSET PROCESS

When an interface, module, or configuration schema is identified for sunsetting, the following four-stage pipeline must be executed:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  1. Identify &  │      │  2. Instrument  │      │  3. Document &  │      │   4. Physical   │
│   Classify      │ ───> │     Warnings    │ ───> │  Release Notes  │ ───> │     Removal     │
│ (Architect/PR)  │      │ (Console/Logs)  │      │  (Minor/Patch)  │      │ (v2.0.0 Only)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Stage 1: Identification & Classification

An ADR (Architectural Decision Record) must be submitted proposing the deprecation. The proposal must justify why the code is redundant, identify its replacement, and map the dependency impact.

### Stage 2: Console & Telemetry Instrumentation

Before removal, the deprecated file or interface must be modified to emit warning messages.

- For CLI scripts, output an explicit warning to `stderr`:
  ```javascript
  console.warn(
    `[DEPRECATION WARNING] scripts/task-engine.js is deprecated. Please migrate to scripts/task-engine-v3.js.`
  );
  ```
- For internal programmatic interfaces, log warnings to the centralized logger or audit trail.

### Stage 3: Documentation Updates

The affected file must be labeled with standard JSDoc `@deprecated` tags, and added to the official deprecation tables in `docs/DEPRECATION_POLICY.md` and `CHANGELOG.md`.

### Stage 4: Physical Removal

The code is physically removed from active source directories and, if applicable, moved to the `archive/` folder. This stage **can only occur** upon transitioning to a new major semver version (e.g., `v2.0.0`).

---

## 4. COMPATIBILITY GUARANTEES

To guarantee that production workflows remain resilient, PromptAgent enforces the following compatibility guidelines:

### 4.1. Storage Schema Backward-Compatibility

Even when older v1 scripts are removed, the JSON output schema formats generated by PromptAgent (such as state files `agent-state.json` or task logs) must remain readable. The framework uses `adapters/legacy-adapter.js` to automatically parse and upgrade older format layers.

- The adapter will remain in place to guarantee that projects created under `v1.0.0` can be upgraded seamlessly.

### 4.2. Configuration Schemas

Schema properties in `schemas/` will not be renamed or removed during the v1.x lifecycle. Optional keys may be added in patch/minor versions, but mandatory properties will remain constant.
