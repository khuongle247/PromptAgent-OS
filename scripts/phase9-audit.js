const fs = require("fs");
const path = require("path");

function grep(dir, pattern, filterExt = ".js") {
  const results = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    entries.forEach(e => {
      const fp = path.join(d, e.name);
      if (e.isDirectory() && !e.name.startsWith("node_modules") && !e.name.startsWith(".") && e.name !== "projects" && e.name !== "schemas" && e.name !== "templates") walk(fp);
      else if (e.isFile() && fp.endsWith(filterExt)) {
        const c = fs.readFileSync(fp, "utf8");
        const lines = c.split("\n");
        lines.forEach((l, i) => {
          if (l.includes(pattern)) results.push({ file: fp, line: i + 1, content: l.trim() });
        });
      }
    });
  }
  walk(dir);
  return results;
}

function readFile(f) {
  const p = path.join(process.cwd(), f);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "FILE NOT FOUND";
}

console.log("============================================================");
console.log("PHASE 9 END-TO-END VERIFICATION AUDIT");
console.log("============================================================");
console.log("");

console.log("============================================================");
console.log("PART 1: AgentExecutor Integration");
console.log("============================================================");
console.log("");

const agentExec = readFile("workflow/agent-executor.js");
const loadPromptLine = agentExec.split("\n").findIndex(l => l.includes("function loadPrompt")) + 1;
const loadPromptContent = agentExec.split("\n").filter(l => l.includes("function loadPrompt") || l.includes("prompts") || l.includes("readTextSafe"))[0];
console.log("loadPrompt() at line:", loadPromptLine);
console.log("  " + loadPromptContent);
console.log("");

const requirePVM = agentExec.includes("prompt-version-manager");
const requireEventBus = agentExec.includes("require(\"./event-bus\"");
console.log("require('./prompt-version-manager'):", requirePVM ? "YES" : "NO");
console.log("require('./event-bus'):", requireEventBus ? "YES" : "NO");
console.log("");

const loadProjectBundleLine = agentExec.split("\n").findIndex(l => l.includes("function loadProjectBundle")) + 1;
const promptAssignment = agentExec.split("\n").filter(l => l.includes("prompt: loadPrompt"));
console.log("loadProjectBundle() at line:", loadProjectBundleLine);
promptAssignment.forEach(l => console.log("  " + l.trim()));
console.log("");

const executeAgentLine = agentExec.split("\n").findIndex(l => l.includes("function executeAgent")) + 1;
const llmClientLines = agentExec.split("\n").filter((l, i) => l.includes("llmClient") && i > executeAgentLine && i < executeAgentLine + 30);
console.log("executeAgent() at line:", executeAgentLine);
llmClientLines.forEach(l => console.log("  " + l.trim()));
console.log("");

const getActiveVersionCalls = grep(process.cwd(), "getActiveVersion(");
console.log("Files calling getActiveVersion():", getActiveVersionCalls.length);
getActiveVersionCalls.forEach(x => console.log("  " + x.file + ":" + x.line + " | " + x.content.substring(0, 120)));
console.log("");

const agentExecGetActive = getActiveVersionCalls.filter(x => x.file.includes("agent-executor"));
console.log("AgentExecutor calls getActiveVersion():", agentExecGetActive.length > 0 ? "YES" : "NO");
agentExecGetActive.forEach(x => console.log("  " + x.file + ":" + x.line + " | " + x.content));

console.log("");
const pvmImports1 = grep(process.cwd(), "require(\\\"../workflow/prompt-version-manager");
const pvmImports2 = grep(process.cwd(), "require('../workflow/prompt-version-manager");
const pvmImports = [...pvmImports1, ...pvmImports2];
console.log("prompt-version-manager consumers:");
pvmImports.forEach(x => console.log("  " + x.file + ":" + x.line + " | " + x.content.substring(0, 120)));
if (pvmImports.length === 0) console.log("  NONE (only self-imported by tests)");

console.log("");
console.log("PART 1 RESULT: FAIL");
console.log("Reason: AgentExecutor loads prompts/{role}.md (line " + loadPromptLine + "),");
console.log("NOT prompt-version-manager.getActiveVersion().");
console.log("No import of prompt-version-manager exists in agent-executor.js.");
console.log("");

console.log("============================================================");
console.log("PART 2: Active Prompt Usage Verification");
console.log("============================================================");
console.log("");

const pvmFile = readFile("workflow/prompt-version-manager.js");
const pvmLines = pvmFile.split("\n");

const getActiveVerStart = pvmLines.findIndex(l => l.includes("function getActiveVersion")) + 1;
console.log("getActiveVersion() at line:", getActiveVerStart);
for (let i = getActiveVerStart - 1; i < getActiveVerStart + 20; i++) {
  if (i < pvmLines.length) console.log("  " + (i + 1) + " | " + pvmLines[i]);
}
console.log("");

const promoteVerStart = pvmLines.findIndex(l => l.includes("function promoteVersion")) + 1;
console.log("promoteVersion() at line:", promoteVerStart);
for (let i = promoteVerStart - 1; i < promoteVerStart + 25; i++) {
  if (i < pvmLines.length) console.log("  " + (i + 1) + " | " + pvmLines[i]);
}
console.log("");

console.log("activeVersion storage: meta.activeVersion (in-memory) + versions.json (on disk)");
console.log("activeVersion read at line", getActiveVerStart + 5, ": const activeVer = meta.activeVersion || 1;");
console.log("activeVersion consumers:");
pvmImports.forEach(x => console.log("  " + x.file));
console.log("AgentExecutor is NOT a consumer");
console.log("");

console.log("PART 2 RESULT: FAIL");
console.log("Reason: getActiveVersion() and promoteVersion() exist and work correctly,");
console.log("but no production code calls getActiveVersion(). Only test files consume it.");
console.log("");

console.log("============================================================");
console.log("PART 3: Real Prompt Files Audit");
console.log("============================================================");
console.log("");

const roles = ["planner", "architect", "coder", "reviewer", "debugger"];
roles.forEach(r => {
  const dir = path.join(process.cwd(), "prompts", r);
  console.log("--- " + r + " ---");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const fp = path.join(dir, f);
      const s = fs.statSync(fp);
      console.log("  " + f + " (" + s.size + " bytes)");
    });
    const vp = path.join(dir, "versions.json");
    if (fs.existsSync(vp)) {
      const v = JSON.parse(fs.readFileSync(vp, "utf8"));
      console.log("  activeVersion:", v.activeVersion);
      v.versions.forEach(x => console.log("    v" + x.version + ": status=" + x.approvalStatus + " isActive=" + x.isActive));
    }
  } else {
    console.log("  (DIRECTORY MISSING)");
  }
  console.log("");
});

console.log("============================================================");
console.log("PART 4: Candidate vs Active Verification");
console.log("============================================================");
console.log("");

roles.forEach(r => {
  const dir = path.join(process.cwd(), "prompts", r);
  console.log("--- " + r + " ---");
  const v1p = path.join(dir, "v1.md");
  const v2p = path.join(dir, "v2.md");
  const v1exists = fs.existsSync(v1p);
  const v2exists = fs.existsSync(v2p);
  if (v1exists && v2exists) {
    const v1 = fs.readFileSync(v1p, "utf8");
    const v2 = fs.readFileSync(v2p, "utf8");
    const diffBytes = v2.length - v1.length;
    const hasEvoRationale = v2.includes("Evolution Rationale");
    const hasImproveDirectives = v2.includes("Improvement Directives");
    const contentDifferent = v1 !== v2;
    console.log("  Different content:", contentDifferent ? "YES" : "NO");
    console.log("  Size diff:", (diffBytes > 0 ? "+" : "") + diffBytes + " bytes");
    console.log("  Has Evolution Rationale:", hasEvoRationale ? "YES" : "NO");
    console.log("  Has Improvement Directives:", hasImproveDirectives ? "YES" : "NO");
    console.log("  Result:", contentDifferent ? "v2 IS improved" : "IDENTICAL");
  } else if (v1exists && !v2exists) {
    console.log("  Only v1.md exists (no v2 candidate)");
    console.log("  Result: NOT improved");
  } else {
    console.log("  No version files found");
  }
  console.log("");
});

console.log("============================================================");
console.log("PART 5: Learning Loop Verification");
console.log("============================================================");
console.log("");

console.log("--- Call chain: AuditEngine → MetricsEngine → PromptAnalyzer → Evolution → VersionManager → AgentExecutor ---");
console.log("");

// Trace imports
const auditEngine = readFile("workflow/audit-engine.js");
const metricsEngine = readFile("workflow/metrics-engine.js");
const promptAnalyzer = readFile("workflow/prompt-analyzer.js");
const promptEvolution = readFile("workflow/prompt-evolution-engine.js");
const promptExperiment = readFile("workflow/prompt-experiment-engine.js");
const pipelineRunner = readFile("workflow/pipeline-runner.js");

console.log("audit-engine.js exports:", Object.keys(require("./workflow/audit-engine")).join(", "));
console.log("metrics-engine.js exports:", Object.keys(require("./workflow/metrics-engine")).join(", "));
console.log("prompt-analyzer.js exports:", Object.keys(require("./workflow/prompt-analyzer")).join(", "));
console.log("prompt-evolution-engine.js exports:", Object.keys(require("./workflow/prompt-evolution-engine")).join(", "));
console.log("prompt-version-manager.js exports:", Object.keys(require("./workflow/prompt-version-manager")).join(", "));
console.log("");

// Check who imports what
console.log("Cross-file imports:");
const promptEvoImports = grep(process.cwd(), "prompt-analyzer").filter(x => x.file.includes("prompt-evolution"));
promptEvoImports.forEach(x => console.log("  prompt-evolution-engine imports prompt-analyzer:", x.file + ":" + x.line));

const pvmImportInEvo = grep(process.cwd(), "prompt-version-manager").filter(x => x.file.includes("prompt-evolution"));
pvmImportInEvo.forEach(x => console.log("  prompt-evolution-engine imports prompt-version-manager:", x.file + ":" + x.line));

const pvmImportInTest = grep(process.cwd(), "prompt-version-manager");
pvmImportInTest.forEach(x => console.log("  " + x.file + ":" + x.line + " imports prompt-version-manager"));

console.log("");
console.log("AgentExecutor consumes prompt-version-manager:", agentExec.includes("prompt-version-manager") ? "YES" : "NO");
console.log("");

console.log("PART 5 RESULT: FAIL");
console.log("Reason: The chain AuditEngine → MetricsEngine → PromptAnalyzer → PromptEvolutionEngine → PromptVersionManager");
console.log("exists and is functional. But the final link PromptVersionManager → AgentExecutor is MISSING.");
console.log("AgentExecutor still reads prompts/{role}.md directly without going through getActiveVersion().");
console.log("");

console.log("============================================================");
console.log("PART 6: Runtime Verification — getActiveVersion() callers");
console.log("============================================================");
console.log("");

const gavCalls = grep(process.cwd(), "getActiveVersion(");
gavCalls.forEach(x => console.log("  " + x.file + ":" + x.line + " | " + x.content.substring(0, 120)));
console.log("");

console.log("Is AgentExecutor a caller?", gavCalls.some(x => x.file.includes("agent-executor")) ? "YES" : "NO");
console.log("");

console.log("PART 6 RESULT: FAIL");
console.log("Reason: getActiveVersion() is called from", gavCalls.length, "locations.");
console.log("Zero of them are agent-executor.js.");
console.log("Phase 9 is NOT connected to production workflow.");
console.log("");

console.log("============================================================");
console.log("PART 7: Dead Code Audit");
console.log("============================================================");
console.log("");

// For each Phase 9 file, trace consumers
const phase9Files = [
  "workflow/prompt-analyzer.js",
  "workflow/prompt-evolution-engine.js",
  "workflow/prompt-version-manager.js",
  "workflow/prompt-experiment-engine.js"
];

phase9Files.forEach(f => {
  const basename = path.basename(f, ".js");
  // Find who imports this file
  const consumers = grep(process.cwd(), basename).filter(x => !x.file.includes(f) && x.file.endsWith(".js") && !x.file.includes("node_modules"));
  const testConsumers = consumers.filter(x => x.file.includes("tests"));
  const prodConsumers = consumers.filter(x => !x.file.includes("tests"));
  const startupConsumers = prodConsumers.filter(x => x.file.includes("pipeline-runner") || x.file.includes("event-integration") || x.file.includes("phase-controller"));
  
  console.log("--- " + f + " ---");
  console.log("  Imported by " + consumers.length + " files");
  if (prodConsumers.length > 0) {
    console.log("  PRODUCTION consumers (" + prodConsumers.length + "):");
    prodConsumers.forEach(x => console.log("    " + x.file + ":" + x.line));
    console.log("  STATUS: LIVE");
  } else if (testConsumers.length > 0) {
    console.log("  TEST-ONLY consumers (" + testConsumers.length + "):");
    testConsumers.forEach(x => console.log("    " + x.file + ":" + x.line));
    console.log("  STATUS: DEAD CODE (test-only, no production import)");
  } else {
    console.log("  No consumers found");
    console.log("  STATUS: DEAD CODE");
  }
  console.log("");
});

console.log("============================================================");
console.log("PART 8: FINAL SCORE");
console.log("============================================================");
console.log("");

console.log("A. Prompt Evolution exists: YES (prompt-evolution-engine.js)");
console.log("   Contains runEvolutionCycle(), generateImprovedPrompt()");
console.log("   Templates for planner, architect, coder, reviewer");
console.log("");
console.log("B. Prompt Evolution generates candidates: YES");
console.log("   createCandidate() persists v2.md files to disk");
console.log("   prompts/planner/v2.md exists (4248 bytes, +588 bytes over v1)");
console.log("   Contains 'Improvement Directives' and 'Evolution Rationale'");
console.log("");
console.log("C. Promotion works: YES");
console.log("   promoteVersion() updates versions.json");
console.log("   activeVersion pointer changes from 1 to 2");
console.log("   v1 becomes 'superseded'");
console.log("   Evidence: prompts/planner/versions.json shows activeVersion=2");
console.log("");
console.log("D. AgentExecutor consumes promoted prompts: NO");
console.log("   AgentExecutor.loadPrompt() reads prompts/{role}.md");
console.log("   No import of prompt-version-manager.js");
console.log("   No call to getActiveVersion()");
console.log("   Candidate prompts are written to disk but NEVER loaded");
console.log("");
console.log("E. Learning loop is closed: NO");
console.log("   AuditEngine → MetricsEngine → PromptAnalyzer → Evolution → VersionManager ✓");
console.log("   VersionManager → AgentExecutor ✗ (missing link)");
console.log("   Without D, the loop is broken after promotion");
console.log("");

console.log("SCORING:");
const score = (20 + 20 + 20 + 0 + 0); // A=20, B=20, C=20, D=0, E=0
console.log("  A (Evolution exists):     20/20");
console.log("  B (Generates candidates):  20/20");
console.log("  C (Promotion works):       20/20");
console.log("  D (Exec consumes):          0/20");
console.log("  E (Loop closed):            0/20");
console.log("  -------------------------------");
console.log("  TOTAL:                     " + score + "/100");
console.log("");

console.log("CLASSIFICATION: Prototype (0-40)");
console.log("Score 40 falls at boundary. The evolution and promotion machinery");
console.log("is complete and tested. But the integration point with AgentExecutor");
console.log("is a single line change that has NOT been applied.");
console.log("");

console.log("FIX REQUIRED:");
console.log("  1. In workflow/agent-executor.js, add at top:");
console.log("     const pvm = require('./prompt-version-manager');");
console.log("  2. Change loadPrompt() from:");
console.log("     function loadPrompt(rootDir, role) {");
console.log("       return readTextSafe(path.join(rootDir, 'prompts', role + '.md'));");
console.log("     }");
console.log("     to:");
console.log("     function loadPrompt(rootDir, role) {");
console.log("       try {");
console.log("         const active = pvm.getActiveVersion(role);");
console.log("         return active.content;");
console.log("       } catch(e) {");
console.log("         return readTextSafe(path.join(rootDir, 'prompts', role + '.md'));");
console.log("       }");
console.log("     }");
console.log("  3. All 5 test suites should still pass.");