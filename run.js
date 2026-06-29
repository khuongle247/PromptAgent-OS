#!/usr/bin/env node

/**
 * run.js — Canonical Single Entrypoint for PromptAgent
 *
 * This is the ONLY supported production entrypoint.
 * All other entrypoints (CLI scripts, workflow/* direct execution) are
 * INTERNAL USE ONLY and should not be used for production startup.
 *
 * Usage:
 *   node run.js ProjectName
 *
 * Or via npm:
 *   npm start -- ProjectName
 */

const { runPipeline } = require("./workflow/pipeline-runner");

const projectName = process.argv[2];

if (!projectName) {
  console.log("Usage: node run.js ProjectName");
  console.log("  Example: node run.js my-project");
  process.exit(1);
}

try {
  const result = runPipeline(process.cwd(), projectName);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ready ? 0 : 1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
