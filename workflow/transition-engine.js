const AGENT_SEQUENCE = ["planner", "architect", "coder", "reviewer", "debugger"];

const TRANSITIONS = {
  planner: {
    onSuccess: "architect",
    onFailure: "debugger",
    onRetry: "planner"
  },
  architect: {
    onSuccess: "coder",
    onFailure: "debugger",
    onRetry: "architect"
  },
  coder: {
    onSuccess: "reviewer",
    onFailure: "debugger",
    onRetry: "coder"
  },
  reviewer: {
    onApproved: null,
    onChangesRequested: "coder",
    onRejected: "debugger",
    onFailure: "debugger",
    onRetry: "reviewer"
  },
  debugger: {
    onSuccess: "coder",
    onFailure: null,
    onRetry: "debugger"
  }
};

function getAgentConfig(agent) {
  return TRANSITIONS[agent] || null;
}

function isTerminal(agent, status) {
  if (agent === "reviewer" && status === "approved") {
    return true;
  }

  if (agent === "debugger" && status === "failed") {
    return false;
  }

  return false;
}

function nextAgentFromResult(agent, result) {
  const config = getAgentConfig(agent);
  if (!config) {
    return null;
  }

  if (result && result.validation && result.validation.valid === false) {
    return config.onFailure || null;
  }

  if (agent === "reviewer") {
    const decision = String(
      result?.output?.decision || result?.rawOutput?.decision || ""
    ).toLowerCase();

    if (decision === "approved") {
      return config.onApproved;
    }

    if (decision === "changes-requested") {
      return config.onChangesRequested;
    }

    if (decision === "rejected") {
      return config.onRejected;
    }

    return config.onFailure || null;
  }

  return config.onSuccess || null;
}

function shouldRetry(state, result) {
  if (!state) {
    return false;
  }

  const maxRetries = typeof state.maxRetries === "number" ? state.maxRetries : 3;
  const retryCount = typeof state.retryCount === "number" ? state.retryCount : 0;
  const valid = Boolean(result && result.validation && result.validation.valid);

  if (valid) {
    return false;
  }

  return retryCount < maxRetries;
}

function evaluateTransition(state, result) {
  const currentAgent = state?.currentAgent || "planner";

  if (!result) {
    return {
      action: "retry",
      nextAgent: currentAgent,
      status: "failed",
      reason: "Missing execution result"
    };
  }

  if (result.ok && result.validation && result.validation.valid) {
    const nextAgent = nextAgentFromResult(currentAgent, result);

    if (!nextAgent) {
      return {
        action: "finish",
        nextAgent: null,
        status: "approved",
        reason: `${currentAgent} completed successfully`
      };
    }

    return {
      action: "advance",
      nextAgent,
      status: currentAgent === "reviewer" ? "approved" : "completed",
      reason: `${currentAgent} completed successfully`
    };
  }

  const nextAgent =
    currentAgent === "reviewer"
      ? "debugger"
      : getAgentConfig(currentAgent)?.onFailure || "debugger";

  if (shouldRetry(state, result)) {
    return {
      action: "retry",
      nextAgent: currentAgent,
      status: "failed",
      reason:
        result?.validation?.errors?.[0] || result?.error || `${currentAgent} validation failed`
    };
  }

  return {
    action: nextAgent ? "advance" : "finish",
    nextAgent,
    status: "blocked",
    reason: result?.validation?.errors?.[0] || result?.error || `${currentAgent} validation failed`
  };
}

function advanceState(state, transition, overrides = {}) {
  const nextState = {
    ...state,
    ...overrides,
    currentAgent: transition.nextAgent || "none",
    status: transition.status || state.status,
    lastError:
      transition.status === "failed" || transition.status === "blocked" ? transition.reason : null,
    retryCount:
      transition.action === "retry"
        ? (state.retryCount || 0) + 1
        : transition.status === "approved"
          ? 0
          : (overrides.retryCount ?? state.retryCount ?? 0),
    updatedAt: new Date().toISOString()
  };

  if (transition.status === "approved" || transition.action === "finish") {
    nextState.retryCount = 0;
  }

  return nextState;
}

function getNextAgent(agent, status) {
  const config = getAgentConfig(agent);
  if (!config) {
    return null;
  }

  if (status === "approved") {
    return config.onApproved ?? config.onSuccess ?? null;
  }

  if (status === "changes-requested") {
    return config.onChangesRequested || config.onRetry || null;
  }

  if (status === "rejected") {
    return config.onRejected || config.onFailure || null;
  }

  if (status === "failed" || status === "blocked") {
    return config.onFailure || null;
  }

  return config.onSuccess || null;
}

module.exports = {
  AGENT_SEQUENCE,
  TRANSITIONS,
  getAgentConfig,
  isTerminal,
  nextAgentFromResult,
  shouldRetry,
  evaluateTransition,
  advanceState,
  getNextAgent
};
