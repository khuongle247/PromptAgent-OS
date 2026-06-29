const fs = require("fs");
const path = require("path");

const { readJson, readText, validateSchema } = require("../scripts/validation/validation-utils");

const { getRoleConfig, getCurrentWorkflowState } = require("./phase-controller");
const { retrieveMemories } = require("./memory-retrieval-engine"); // New import for context

function readJsonSafe(filePath) {
  try {
    return readJson(filePath);
  } catch (error) {
    return null;
  }
}

function resolveAgentOutputPath(projectDir, role) {
  const candidates = [path.join(projectDir, `${role}-output.json`)];

  if (role === "planner") {
    candidates.unshift(path.join(projectDir, "planner-output.json"));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function buildAgentContext(rootDir, projectDir, role) {
  const config = getRoleConfig(role);
  const projectPath = path.join(projectDir, "project.json");
  const project = fs.existsSync(projectPath) ? readJsonSafe(projectPath) : null;

  const relevantMemories = retrieveMemories(rootDir, projectDir, `context for ${role} agent`, {
    limit: 5
  });

  return {
    role,
    workflowState: getCurrentWorkflowState(project || {}),
    project,
    requirements: fs.existsSync(path.join(projectDir, "docs", "requirements.md"))
      ? readText(path.join(projectDir, "docs", "requirements.md"))
      : "",
    features: fs.existsSync(path.join(projectDir, "docs", "features.md"))
      ? readText(path.join(projectDir, "docs", "features.md"))
      : "",
    architecture: fs.existsSync(path.join(projectDir, "docs", "architecture.md"))
      ? readText(path.join(projectDir, "docs", "architecture.md"))
      : "",
    prompt:
      config && fs.existsSync(path.join(rootDir, "prompts", config.promptFile))
        ? readText(path.join(rootDir, "prompts", config.promptFile))
        : "",
    contract:
      config &&
      config.contractFile &&
      fs.existsSync(path.join(rootDir, "schemas", "contracts", config.contractFile))
        ? readJsonSafe(path.join(rootDir, "schemas", "contracts", config.contractFile))
        : null,
    inputSchemaPath: config ? path.join(rootDir, "schemas", config.inputSchema) : null,
    outputSchemaPath: config ? path.join(rootDir, "schemas", config.outputSchema) : null,
    relevantMemories // New: pass relevant memories to the agent context
  };
}

function prepareAgentRun(rootDir, projectDir, role) {
  const config = getRoleConfig(role);
  if (!config) {
    return {
      ready: false,
      errors: [`Unknown role: ${role}`]
    };
  }

  const context = buildAgentContext(rootDir, projectDir, role);
  const inputSchema = readJsonSafe(context.inputSchemaPath);
  const outputSchema = readJsonSafe(context.outputSchemaPath);
  const promptReady = context.prompt.trim().length > 0;

  return {
    ready: Boolean(promptReady && inputSchema && outputSchema),
    role,
    nextRole: config.nextRole,
    context,
    promptReady,
    inputSchemaPath: context.inputSchemaPath,
    outputSchemaPath: context.outputSchemaPath
  };
}

function validateAgentOutput(rootDir, projectDir, role) {
  const config = getRoleConfig(role);
  if (!config) {
    return { valid: false, errors: [`Unknown role: ${role}`] };
  }

  const outputPath = resolveAgentOutputPath(projectDir, role);
  if (!fs.existsSync(outputPath)) {
    return { valid: false, errors: [`Missing output artifact: ${path.basename(outputPath)}`] };
  }

  const output = readJson(outputPath);
  const schema = readJsonSafe(path.join(rootDir, "schemas", config.outputSchema));
  const result = validateSchema(output, schema);

  return {
    valid: result.valid,
    errors: (result.errors || []).map(
      error => `${path.basename(outputPath)}: ${error.instancePath} ${error.message}`
    ),
    output
  };
}

function runAgent(rootDir, projectDir, role) {
  const preparation = prepareAgentRun(rootDir, projectDir, role);
  const outputValidation = validateAgentOutput(rootDir, projectDir, role);

  return {
    ...preparation,
    outputValidation,
    completed: preparation.ready && outputValidation.valid
  };
}

module.exports = {
  buildAgentContext,
  prepareAgentRun,
  validateAgentOutput,
  runAgent
};
