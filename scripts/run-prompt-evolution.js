#!/usr/bin/env node
const promptEvolution = require("../workflow/prompt-evolution-engine");

function summarize(result) {
  const roles = Object.keys(result.evolutionResults || {});
  const evolvedRoles = roles.filter(role => result.evolutionResults[role].evolved);

  console.log("\n=== Prompt Evolution Summary ===");
  console.log(`Generated At: ${result.generatedAt}`);
  console.log(`Analysis Score: ${result.analysisScore}`);
  console.log(`Can Auto-Promote: ${result.canAutoPromote?.canPromote ? "YES" : "NO"}`);
  console.log(`Auto-Promotion Reason: ${result.canAutoPromote?.reason || "N/A"}`);
  console.log(`Roles evaluated: ${roles.length}`);
  console.log(`Roles with new prompt candidates: ${evolvedRoles.length}`);

  roles.forEach(role => {
    const roleResult = result.evolutionResults[role];
    if (!roleResult) return;
    if (roleResult.evolved) {
      console.log(
        `  - ${role}: evolved v${roleResult.version} (parent v${roleResult.parentVersion})`
      );
    } else {
      console.log(`  - ${role}: no evolution (${roleResult.reason || "no change detected"})`);
    }
  });

  return evolvedRoles.length > 0;
}

function main() {
  try {
    const result = promptEvolution.runEvolutionCycle();
    if (!result || typeof result !== "object") {
      console.error("Prompt evolution did not return a valid result.");
      process.exit(1);
    }

    const hasCandidates = summarize(result);
    if (!hasCandidates) {
      console.error("No prompt candidates were generated during evolution.");
      process.exit(1);
    }

    console.log("\nPrompt evolution completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Prompt evolution failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
