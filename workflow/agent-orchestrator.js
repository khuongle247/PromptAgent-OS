const path = require("path");

const { executeAgent } = require("./agent-executor");
const { writeArtifact, readArtifact, listArtifacts } = require("./artifact-store");
const { loadState, saveState, setCurrentAgent, setAgentStatus, bumpPhase, getStatus } = require("./state-manager");
const { evaluateTransition, getNextAgent } = require("./transition-engine");

const DEFAULT_AGENT_LOOP = ["planner", "architect", "coder", "reviewer", "debugger"];

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function ensureState(projectDir) {
  const current = loadState(projectDir);
  if (!current.projectDir || !current.currentAgent || current.currentAgent === "none") {
    return saveState(projectDir, {
      ...current,
      projectDir,
      currentAgent: "planner",
      status: "active",
      phase: typeof current.phase === "number" && current.phase > 0 ? current.phase : 1,
      retryCount: typeof current.retryCount === "number" ? current.retryCount : 0,
      lastError: null
    });
  }

  if (typeof current.phase !== "number" || current.phase < 1) {
    return saveState(projectDir, {
      ...current,
      projectDir,
      phase: 1
    });
  }

  return current;
}

function buildResultEnvelope(step, execution, transition, stateAfter) {
  return {
    step,
    role: execution.role,
    taskId: execution.taskId,
    ok: execution.ok,
    validation: execution.validation,
    artifact: execution.artifact,
    transition,
    state: stateAfter,
    output: execution.output,
    source: execution.source
  };
}

const { analyzeExecutionResults } = require("./learning-loop-engine"); // New import

async function runStep(rootDir, projectDir, role, options = {}) {
  const execution = await executeAgent(rootDir, projectDir, role, options);
  const currentState = getStatus(projectDir);
  const transition = evaluateTransition(currentState, execution);

  let stateAfter = currentState;

  if (transition.action === "retry") {
    stateAfter = setAgentStatus(projectDir, role, "failed", transition.reason, {
      phase: currentState.phase,
      maxRetries: currentState.maxRetries,
      retryCount: (currentState.retryCount || 0) + 1
    });
  } else if (transition.action === "advance") {
    stateAfter = setAgentStatus(projectDir, role, transition.status, transition.reason, {
      phase: currentState.phase,
      retryCount: 0
    });
  } else {
    stateAfter = setAgentStatus(projectDir, role, transition.status, transition.reason, {
      phase: currentState.phase,
      retryCount: 0
    });
  }

  if (execution.artifact) {
    writeArtifact(projectDir, execution.artifact, {
      role: execution.role,
      taskId: execution.taskId,
      source: execution.source,
      schemaPath: execution.validation?.schemaPath || null
    });
  }

  // Analyze execution results for learning loop
  analyzeExecutionResults(rootDir, projectDir, execution);

  // Emit AgentTransitioned event
  const eventBus = require("./event-bus");
  await eventBus.publish("agent-transitioned", {
    fromAgent: currentState.currentAgent,
    toAgent: stateAfter.currentAgent,
    fromStatus: currentState.status,
    toStatus: stateAfter.status,
    action: transition.action,
    reason: transition.reason,
    phase: stateAfter.phase,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0"
  });

  // Emit TaskStatusUpdated event (if task status changed)
  const currentTask = execution.currentTask;
  if (currentTask && currentTask.status !== stateAfter.status) { // Simplified check
     await eventBus.publish("task-status-updated", {
        taskId: currentTask.id,
        oldStatus: currentTask.status,
        newStatus: stateAfter.status,
        agent: role, // Agent responsible for the status change
        timestamp: new Date().toISOString(),
        schemaVersion: "1.0"
     });
  }

  return buildResultEnvelope(role, execution, transition, stateAfter);
}

async function runLoop(rootDir, projectName, options = {}) {
  const projectDir = getProjectDir(rootDir, projectName);
  const state = ensureState(projectDir);
  const maxSteps = Math.max(1, Number(options.maxSteps || 10));
  const sequence = Array.isArray(options.sequence) && options.sequence.length ? options.sequence : DEFAULT_AGENT_LOOP;
  const results = [];

  let currentAgent = state.currentAgent && state.currentAgent !== "none" ? state.currentAgent : sequence[0];
  let currentState = state;
  let step = 0;

  while (currentAgent && step < maxSteps) {
    const execution = await runStep(rootDir, projectDir, currentAgent, {
      taskId: options.taskId,
      llmClient: options.llmClient,
      store: options.store,
      projectDir
    });

    results.push(execution);
    currentState = getStatus(projectDir);

    if (execution.transition.action === "finish") {
      currentAgent = null;
      currentState = setAgentStatus(projectDir, currentAgent || "none", "approved", execution.transition.reason, {
        phase: currentState.phase,
        retryCount: 0
      });
      break;
    }

    if (execution.transition.action === "retry") {
      currentAgent = execution.role;
      step += 1;
      continue;
    }

    if (execution.transition.nextAgent) {
      currentAgent = execution.transition.nextAgent;
      const oldPhase = currentState.phase;
      const nextPhase = currentState.phase + (execution.role === "reviewer" && execution.validation.valid ? 1 : 0);
      currentState = bumpPhase(projectDir, nextPhase, {
        currentAgent,
        status: currentState.status,
        retryCount: 0
      });

      // Emit ProjectPhaseBumped event if phase changed
      if (nextPhase > oldPhase) {
        const eventBus = require("./event-bus");
        await eventBus.publish("project-phase-bumped", {
          projectId: projectName,
          oldPhase,
          newPhase,
          timestamp: new Date().toISOString(),
          schemaVersion: "1.0"
        });
      }

      if (currentAgent === "none") {
        break;
      }
    } else {
      currentAgent = null;
    }

    step += 1;
  }

  const finalState = getStatus(projectDir);
  return {
    projectName,
    projectDir,
    completed: finalState.status === "approved" || finalState.currentAgent === "none",
    state: finalState,
    results,
    artifacts: listArtifacts(projectDir)
  };
}

async function orchestrate(rootDir, projectName, options = {}) {
  return runLoop(rootDir, projectName, options);
}

module.exports = {
  DEFAULT_AGENT_LOOP,
  getProjectDir,
  ensureState,
  runStep,
  runLoop,
  orchestrate
};

if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.log("Usage: node workflow/agent-orchestrator.js ProjectName");
    process.exit(1);
  }

  orchestrate(process.cwd(), projectName)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.completed ? 0 : 1);
    })
    .catch(error => {
      console.error(error.stack || error.message);
      process.exit(1);
    });
}