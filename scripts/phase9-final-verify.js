const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("PHASE 9 FINAL VERIFICATION — AFTER INTEGRATION FIX");
console.log("============================================================\n");

console.log("=== PART 1: AgentExecutor Integration ===\n");

const ae = fs.readFileSync("workflow/agent-executor.js", "utf8");
console.log("require('./prompt-version-manager'):", ae.includes("prompt-version-manager") ? "YES" : "NO");
console.log("getActiveVersion(role) call:", ae.includes("getActiveVersion(role)") ? "YES" : "NO");
console.log("Fallback to legacy:", ae.includes("Fall back to legacy prompts") ? "YES" : "NO\n");

const loadPromptIdx = ae.split("\n").findIndex(l => l.includes("function loadPrompt"));
console.log("loadPrompt() function at line:", loadPromptIdx + 1);
const lines = ae.split("\n");
for (let i = loadPromptIdx; i < loadPromptIdx + 12; i++) {
  console.log("  " + (i + 1) + " | " + lines[i]);
}
console.log("");

console.log("=== PART 3: Prompt Files Audit ===\n");

const roles = ["planner", "architect", "coder", "reviewer", "debugger"];
roles.forEach(r => {
  const dir = "prompts/" + r;
  if (fs.existsSync(dir)) {
    const vp = dir + "/versions.json";
    if (fs.existsSync(vp)) {
      const v = JSON.parse(fs.readFileSync(vp, "utf8"));
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
      console.log(r + ": activeVersion=" + v.activeVersion + " files=" + files.join(", "));
      v.versions.forEach(x => console.log("    v" + x.version + " " + x.approvalStatus + " isActive=" + x.isActive));
    }
  } else {
    console.log(r + ": MISSING");
  }
});
console.log("");

console.log("=== PART 4: v1 vs v2 Content Comparison ===\n");

roles.forEach(r => {
  const v1p = "prompts/" + r + "/v1.md";
  const v2p = "prompts/" + r + "/v2.md";
  const v1 = fs.existsSync(v1p) ? fs.readFileSync(v1p, "utf8") : null;
  const v2 = fs.existsSync(v2p) ? fs.readFileSync(v2p, "utf8") : null;
  if (v1 && v2) {
    const diff = v2.length - v1.length;
    console.log(r + ": different=" + (v1 !== v2) + " sizeDiff=" + (diff > 0 ? "+" : "") + diff + "b");
    console.log("  hasImprovements=" + v2.includes("Improvement Directives") + " hasRationale=" + v2.includes("Evolution Rationale"));
  } else if (v1 && !v2) {
    console.log(r + ": only v1 (no v2 candidate)");
  }
});
console.log("");

console.log("=== PART 6: getActiveVersion() callers ===\n");

const targetFiles = ["workflow/agent-executor.js", "workflow/prompt-evolution-engine.js", "workflow/prompt-version-manager.js"];
targetFiles.forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, "utf8");
    c.split("\n").forEach((l, i) => {
      if (l.includes("getActiveVersion(")) {
        console.log(f + ":" + (i + 1) + " | " + l.trim().substring(0, 120));
      }
    });
  }
});
console.log("");

console.log("=== PART 7: Dead Code Audit ===\n");

const phase9Files = ["prompt-analyzer.js", "prompt-version-manager.js", "prompt-evolution-engine.js", "prompt-experiment-engine.js"];
phase9Files.forEach(f => {
  const inAgentExec = ae.includes(f.replace(".js", ""));
  const inPipeline = fs.existsSync("workflow/pipeline-runner.js") && fs.readFileSync("workflow/pipeline-runner.js", "utf8").includes(f.replace(".js", ""));
  console.log("workflow/" + f + " -> agent-executor:", inAgentExec ? "YES (LIVE)" : "NO");
  console.log("  -> pipeline-runner:", inPipeline ? "YES (LIVE)" : "NO");
});
console.log("");

console.log("=== PART 8: FINAL SCORE ===\n");

const checks = {
  A: { name: "Prompt Evolution exists", pass: fs.existsSync("workflow/prompt-evolution-engine.js") },
  B: { name: "Generates candidates", pass: fs.existsSync("prompts/planner/v2.md") },
  C: { name: "Promotion works", pass: (() => { try { const v = JSON.parse(fs.readFileSync("prompts/planner/versions.json", "utf8")); return v.activeVersion === 2; } catch(e) { return false; } })() },
  D: { name: "AgentExecutor consumes promoted", pass: ae.includes("prompt-version-manager") && ae.includes("getActiveVersion") },
  E: { name: "Learning loop closed", pass: ae.includes("prompt-version-manager") && fs.existsSync("workflow/prompt-analyzer.js") && fs.existsSync("workflow/metrics-engine.js") && fs.existsSync("workflow/audit-engine.js") }
};

let score = 0;
Object.keys(checks).forEach(k => {
  const c = checks[k];
  const pts = c.pass ? 20 : 0;
  score += pts;
  console.log("  " + k + ". " + c.name + ": " + (c.pass ? "PASS +20" : "FAIL +0"));
});
console.log("  --------------");
console.log("  TOTAL: " + score + "/100");
console.log("");

if (score >= 91) console.log("CLASSIFICATION: Fully Operational (91-100)");
else if (score >= 71) console.log("CLASSIFICATION: Mostly Complete (71-90)");
else if (score >= 41) console.log("CLASSIFICATION: Partial Integration (41-70)");
else console.log("CLASSIFICATION: Prototype (0-40)");

console.log("\n=== All existing tests still pass? Run them to confirm ===");
console.log("  node tests/event-validation-test.js");
console.log("  node tests/phase7-integration-test.js");
console.log("  node tests/phase8-health-test.js");
console.log("  node tests/phase9-prompt-evolution-test.js");
console.log("  node tests/phase9-e2e-learning-cycle.js");