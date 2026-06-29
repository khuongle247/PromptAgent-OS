# EXTENSION GUIDE — PromptAgent v1.x Lifecycle

**Version:** 1.0.0-beta  
**Status:** APPROVED  
**Date:** June 27, 2026  
**Author:** Chief Software Architect

---

## 1. EXTENSION PHILOSOPHY

To keep PromptAgent fast, maintainable, and robust, the core execution engine is closed to direct file modifications. We embrace an **extension-first approach** for developers who want to introduce new behaviors.

Instead of refactoring core modules (`agent-orchestrator.js`, `agent-executor.js`, or `pipeline-runner.js`), developers should build on top of established **extension points**. This guarantees that upstream framework updates can be merged without merge conflicts or breaking custom workflows.

---

## 2. ALLOWED EXTENSION POINTS

The framework provides three standard surfaces for customization and custom functionality.

### 2.1. Dynamic Custom Prompts (Public Extension Point)

Developers can supply custom prompt contexts without modifying code by adding versioned directories to the `prompts/` folder.

- **How to Extend:**
  1. Create a subdirectory under `prompts/<role_name>/` (e.g., `prompts/coder/v2.md`).
  2. The `prompt-version-manager.js` automatically maps the folder, indexing files as version configurations.
  3. Update `config/prompt-evolution.json` or state files to invoke the specific version.

### 2.2. Event Bus Subscriptions (Public Observer Extension Point)

The absolute best way to add external behavior (e.g., sending Slack alerts on agent failures, storing telemetry in an external DB, or visual monitoring) is via event subscriptions.

- **How to Extend:**
  Create a standalone observer and subscribe to the global `event-bus.js`:

  ```javascript
  const eventBus = require("./workflow/event-bus");

  eventBus.subscribe("agent-executed", eventData => {
    // Inject custom notification, logging, or third-party service integration
    sendCustomSlackNotification(eventData);
  });
  ```
  - **Boundary Guarantee:** Event subscribers are strictly downstream and decoupled. They must never directly invoke core state-mutating functions synchronously.

### 2.3. Project Artifact Validators (Internal Hook Point)

Custom validation logic can be added to the unified pipeline without altering the core sequence.

- **How to Extend:**
  1. Create a validation module under `validation/` (e.g., `validation/my-custom-validator.js`).
  2. Implement a standard validation handler returning `{ valid: boolean, errors: string[] }`.
  3. Register the validator inside `workflow/unified-validation-pipeline.js` by requiring and executing it during the pre-flight hook phase.

---

## 3. FORBIDDEN MODIFICATIONS

To protect the production-ready framework, the following structural edits are strictly forbidden:

- 🚫 **Direct modification of the Core Loop:** You must never add custom phase-routing code inside `agent-orchestrator.js`. All routing rules belong inside `transition-engine.js` or via schema-driven transitions.
- 🚫 **Synchronous File System Overwrites:** Plugins and custom validators must never directly bypass `artifact-store.js` or `state-manager.js` to modify files in the active `projects/` directory.
- 🚫 **Bypassing the Entrypoint:** Adding a new startup script outside of `run.js` is prohibited. Custom setups should be fed as parameters to `run.js`.
- 🚫 **Custom Event Schemes Modification:** You must never publish custom events on the `event-bus.js` without declaring and registering a corresponding validator schema inside `schemas/events/`. Bypassing validation middleware will cause events to be rejected.

---

## 4. FUTURE PLUGIN API ROADMAP (v2.0)

For the future `v2.0` release, a formal, sandboxed plugin system is planned to standardize these entrypoints:

```
┌────────────────────────────────────────────────────────────────┐
│                       PROMPTAGENT CORE                         │
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Lifecycle Hook │  │  Storage Hook   │  │   Event Hook   │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
└───────────┼────────────────────┼───────────────────┼───────────┘
            ▼                    ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                        EXTERNAL PLUGINS                        │
└────────────────────────────────────────────────────────────────┘
```

### Planned Hook Surfaces:

1. **`onBeforeAgentRun(context)`:** Allows safe pre-execution context mutation or token-injection.
2. **`onAfterAgentRun(result)`:** Intercepts LLM outputs to inject custom sanitization before JSON schema validation.
3. **`customStoreAdapter`:** Allows overriding standard local JSON storage with Redis or Postgres databases.
