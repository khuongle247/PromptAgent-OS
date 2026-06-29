# PromptAgent: AI Orchestration & Prompt Evolution Framework

## 🚀 Overview
PromptAgent is a robust Node.js-based AI orchestration framework designed to automate complex software engineering workflows. It operates through multi-stage AI agents (e.g., planning, execution, validation, debugging) and continuously learns and evolves its prompts for optimal performance. The system is built around a **single entrypoint architecture** ensuring deterministic and controlled execution.

## ✨ Core Principles
*   **Single Entrypoint System:** A unified starting point for the entire framework.
*   **Deterministic Execution Flow:** Predictable and consistent operation across all stages.
*   **Event-Driven Architecture:** Loose coupling between components via an asynchronous event bus.
*   **Modular Workflow Engine:** Flexible and extensible design for agent-based workflows.

## ▶️ Entrypoint
PromptAgent is designed to be started via a single, canonical entrypoint:

```bash
npm start
# or
node run.js <ProjectName>
```

The `run.js` script located at the project root is the **ONLY public entrypoint** for the PromptAgent system. It acts as a lightweight bootstrap layer, delegating the core execution flow to the internal `workflow/pipeline-runner.js` module. No other file should be directly invoked to start the full system in a production or integrated environment.

## 🏛️ Architecture Overview (High-Level)
PromptAgent's architecture is structured for clarity and maintainability:

*   **`run.js` (Bootstrap Layer):** The external interface and single entrypoint, responsible for initial setup and delegating to the core pipeline.
*   **`workflow/pipeline-runner.js` (Core Orchestration Engine):** Manages the overall execution flow, integrating various internal workflow modules.
*   **`workflow/` (Internal Execution Modules):** A collection of specialized modules (e.g., `agent-orchestrator`, `agent-executor`, `state-manager`, `learning-loop-engine`) that handle specific aspects of the AI workflow. These are internal components and are not designed for direct invocation.
*   **Event System:** Powered by `workflow/event-bus.js`, `workflow/event-schema-registry.js`, and `workflow/event-validation-middleware.js`, this system enables asynchronous communication and ensures data integrity across the framework.
*   **Evolution System:** Modules like `workflow/prompt-evolution-engine.js` drive the self-improvement of prompts, supported by `prompt-version-manager.js` and `prompt-analyzer.js`.
*   **Observability:** Comprehensive monitoring capabilities are provided through `workflow/metrics-engine.js`, `workflow/audit-engine.js`, and `workflow/framework-health.js`, offering insights into system performance and behavior.

## 🔄 System Flow
```
run.js
  ↓
pipeline-runner
  ↓
bootstrap (event system, state initialization, validation pipeline)
  ↓
agent execution loop (planning → architecting → coding → reviewing → debugging)
  ↓
prompt evolution + metrics + audit
```

## ⚙️ Installation
To set up and run PromptAgent:

```bash
npm install
npm start <ProjectName>
# Example:
npm start my-new-project
```
Replace `<ProjectName>` with the desired name for your AI project.

## 🛠️ Configuration
*   **`config/prompt-evolution.json`:** This file dictates the behavior of the prompt evolution system, including thresholds for auto-promotion and scheduler intervals.
*   **Environment Variables:** Specific environment variables can be used for system-wide tuning (e.g., LLM API keys).
*   **System Tuning:** The `prompt-evolution-scheduler.js` can be configured to adjust the frequency and conditions for automated prompt improvements.

## 🧑‍💻 Development Guide
*   **Adding New Workflow Modules:** New modules should integrate with `workflow/pipeline-runner.js` and communicate via the Event Bus.
*   **Extending Agents Safely:** Existing agents can be extended by modifying their prompts (managed by `prompt-version-manager.js`) and ensuring schema compatibility.
*   **Adding New Validation Rules:** Implement new validation logic within the existing validation pipeline (`unified-validation-pipeline.js`) or add custom event validation middleware.
*   **Do NOT Modify Entrypoint:** Avoid altering `run.js` or directly invoking internal `workflow/` modules for system startup in production environments. Focus on extending existing modules and integrating via the defined interfaces.

## 📜 Legacy Notice
For backward compatibility and specific development workflows, some legacy scripts and direct execution paths (e.g., `node workflow/pipeline-runner.js`) still exist. These are **NOT** part of the primary runtime startup flow of the single-entrypoint architecture and should be considered deprecated for production system initiation.

## 🐛 Debugging
*   **Use CLI Scripts Individually:** For debugging specific components, individual CLI scripts (e.g., `node scripts/init-project-v2.js`, `node workflow/agent-executor.js ProjectName planner`) can be invoked. Refer to `package.json` for available scripts.
*   **Leverage Logs and Metrics:** The integrated observability layer (audit logs in `logs/audit.jsonl`, metrics in `metrics/`) provides detailed insights into system behavior, failures, and performance.
*   **Avoid Direct Workflow Module Execution:** For system-wide debugging, always start via `npm start` to ensure all core components and event listeners are properly initialized.

## ✅ Safety & Design Guarantee
PromptAgent is engineered with a **single deterministic entrypoint (`run.js`)**, guaranteeing:

*   **No Parallel Startup Paths:** There are no hidden or alternative ways to start the entire system's automated runtime loop.
*   **No Hidden Bootstrap Flows:** All initialization logic is transparently handled through the single entrypoint and its immediate dependencies.
*   **Production-Safe Execution Model:** The system's execution is predictable, auditable, and designed for reliability in production environments.

## 📝 Summary
PromptAgent is a powerful, event-driven AI orchestration framework designed for autonomous software engineering workflows. Its reinforced single-entrypoint architecture ensures a deterministic, production-ready system that is easy to manage, monitor, and extend. This design significantly enhances stability and simplifies operational concerns, making PromptAgent a reliable foundation for continuous AI-driven development.))