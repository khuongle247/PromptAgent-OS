const ROLE_SEQUENCE = ["planner", "architect", "coder", "reviewer", "debugger"];

const ROLE_CONFIG = {
  planner: {
    promptFile: "planner.md",
    contractFile: "planner-to-architect.schema.json",
    inputSchema: "outputs/planner-output.schema.json",
    outputSchema: "outputs/architect-output.schema.json",
    nextRole: "architect"
  },
  architect: {
    promptFile: "architect.md",
    contractFile: "architect-to-coder.schema.json",
    inputSchema: "outputs/architect-output.schema.json",
    outputSchema: "outputs/coder-output.schema.json",
    nextRole: "coder"
  },
  coder: {
    promptFile: "coder.md",
    contractFile: "coder-to-reviewer.schema.json",
    inputSchema: "outputs/coder-output.schema.json",
    outputSchema: "outputs/reviewer-output.schema.json",
    nextRole: "reviewer"
  },
  reviewer: {
    promptFile: "reviewer.md",
    contractFile: "reviewer-to-coder.schema.json",
    inputSchema: "outputs/reviewer-output.schema.json",
    outputSchema: "outputs/coder-output.schema.json",
    nextRole: "coder"
  },
  debugger: {
    promptFile: "debugger.md",
    contractFile: null,
    inputSchema: "contracts/debugger-input.schema.json",
    outputSchema: "outputs/debugger-output.schema.json",
    nextRole: null
  }
};

function getRoleConfig(role) {
  return ROLE_CONFIG[role] || null;
}

function getCurrentWorkflowState(project) {
  const currentRole = project && project.currentRole ? project.currentRole : "planner";
  const phase = Number.isInteger(project && project.phase) ? project.phase : 1;

  return {
    phase,
    currentRole,
    nextRole: getRoleConfig(currentRole) ? getRoleConfig(currentRole).nextRole : null,
    roleConfig: getRoleConfig(currentRole)
  };
}

function getNextRole(role) {
  const config = getRoleConfig(role);
  return config ? config.nextRole : null;
}

function advancePhase(project) {
  const phase = Number.isInteger(project && project.phase) ? project.phase : 1;
  return phase + 1;
}

module.exports = {
  ROLE_SEQUENCE,
  ROLE_CONFIG,
  getRoleConfig,
  getCurrentWorkflowState,
  getNextRole,
  advancePhase
};
