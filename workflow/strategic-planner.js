const fs = require("fs");
const path = require("path");

const { listArtifacts, readArtifact } = require("./artifact-store");
const { loadState } = require("./state-manager");
const { readJsonSafe, readTextSafe } = require("../scripts/validation/validation-utils");

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[-*\d.\[\]x\s]+/, "")
    .trim();
}

function extractGoalsFromMemory(memory) {
  if (!memory || typeof memory !== "object") {
    return [];
  }

  const goals = [];

  if (Array.isArray(memory.importantDecisions)) {
    goals.push(
      ...memory.importantDecisions.map(d => ({
        source: "decision",
        text: String(d.title || d.description || d.name || d)
      }))
    );
  }

  if (Array.isArray(memory.risks)) {
    goals.push(
      ...memory.risks.map(r => ({
        source: "risk-mitigation",
        text: `Mitigate risk: ${String(r.description || r.title || r)}`
      }))
    );
  }

  if (Array.isArray(memory.recentTasks)) {
    goals.push(
      ...memory.recentTasks.map(t => ({
        source: "task-completion",
        text: String(t.title || t.description || t)
      }))
    );
  }

  return goals.filter(goal => goal.text.trim().length >= 10);
}

function extractGoalsFromRequirements(requirementsText) {
  return String(requirementsText || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^#{1,2}\s+|^[-*]\s+|^\d+\.\s+/.test(line) && line.length >= 15)
    .map(line => normalizeText(line))
    .map(text => ({
      source: "requirement",
      text
    }));
}

function analyzeGoal(goal, context = {}) {
  const lower = String(goal).toLowerCase();

  return {
    goal,
    complexity: lower.match(/(complex|integration|architecture|refactor)/i) ? "high" : "medium",
    impactEstimate: lower.match(/(critical|core|essential|primary)/i) ? 5 : 3,
    urgencyEstimate: lower.match(/(urgent|immediate|blocking|high-priority)/i) ? 5 : 2,
    effortEstimate: lower.match(/(quick|simple|straightforward)/i) ? 1 : 3
  };
}

function buildDependencyGraph(subgoals, context = {}) {
  const graph = new Map();
  const artifacts = context.artifacts || [];
  const completedTasks = context.completedTasks || [];

  for (const subgoal of subgoals) {
    const deps = [];
    const lower = String(subgoal.goal).toLowerCase();

    for (const other of subgoals) {
      if (subgoal.goal === other.goal) {
        continue;
      }

      const otherLower = String(other.goal).toLowerCase();

      if (/(depends on|after|following|once|requires)/i.test(lower + otherLower)) {
        deps.push(other.goal);
      }

      if (lower.match(/(ui|frontend)/) && otherLower.match(/(api|backend|data)/)) {
        deps.push(other.goal);
      }

      if (lower.match(/(integration)/) && otherLower.match(/(auth|security)/)) {
        deps.push(other.goal);
      }

      if (lower.match(/(test|validation)/) && otherLower.match(/(feature|implementation)/)) {
        deps.push(other.goal);
      }
    }

    graph.set(subgoal.goal, deps);
  }

  return graph;
}

function detectHiddenDependencies(subgoals, context = {}) {
  const artifacts = context.artifacts || [];
  const memory = context.memory || {};
  const dependencies = {};

  for (const subgoal of subgoals) {
    const goalLower = String(subgoal.goal).toLowerCase();
    const implicitDeps = [];

    for (const artifact of artifacts) {
      const artifactText = String(artifact.id || artifact.role || "").toLowerCase();
      if (goalLower.includes(artifactText) || artifactText.includes(goalLower.slice(0, 10))) {
        implicitDeps.push({
          type: "artifact",
          source: artifact.id,
          reason: `Task references artifact ${artifact.role}:${artifact.taskId}`
        });
      }
    }

    if (Array.isArray(memory.importantDecisions)) {
      for (const decision of memory.importantDecisions) {
        const decText = String(decision.title || decision.description || "").toLowerCase();
        if (decText && goalLower.includes(decText.slice(0, 15))) {
          implicitDeps.push({
            type: "decision",
            source: decision.title || decision.id,
            reason: "Related to previous architectural decision"
          });
        }
      }
    }

    dependencies[subgoal.goal] = implicitDeps;
  }

  return dependencies;
}

function decomposeGoal(goal, depth = 0, maxDepth = 5, context = {}) {
  if (depth >= maxDepth) {
    return {
      goal,
      depth,
      subgoals: [],
      isLeaf: true
    };
  }

  const goalText = String(goal);
  const lower = goalText.toLowerCase();
  const subgoals = [];

  if (depth === 0 && lower.match(/(implement|build|create|add)/i)) {
    subgoals.push({
      goal: `Design ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Implement ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Test ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    if (!lower.match(/(test|spec|validation)/i)) {
      subgoals.push({
        goal: `Validate ${goalText.slice(0, 40)}`,
        depth: depth + 1,
        subgoals: [],
        isLeaf: true
      });
    }
  } else if (depth === 0 && lower.match(/(refactor|optimize|improve)/i)) {
    subgoals.push({
      goal: `Analyze current ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Plan improvements for ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Execute refactoring for ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Verify refactoring for ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });
  } else if (depth === 0) {
    subgoals.push({
      goal: `Understand requirements for ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Plan approach for ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });

    subgoals.push({
      goal: `Execute ${goalText.slice(0, 40)}`,
      depth: depth + 1,
      subgoals: [],
      isLeaf: true
    });
  }

  return {
    goal,
    depth,
    subgoals,
    isLeaf: subgoals.length === 0
  };
}

function flattenPlanTree(node, flattened = []) {
  flattened.push({
    goal: node.goal,
    depth: node.depth,
    isLeaf: node.isLeaf
  });

  if (Array.isArray(node.subgoals)) {
    for (const child of node.subgoals) {
      flattenPlanTree(child, flattened);
    }
  }

  return flattened;
}

function computePriorityScores(subgoals) {
  const scores = [];

  for (const subgoal of subgoals) {
    const analysis = analyzeGoal(subgoal);
    const impact = analysis.impactEstimate || 3;
    const urgency = analysis.urgencyEstimate || 2;
    const effort = Math.max(1, analysis.effortEstimate || 3);

    const score = (impact * urgency) / effort;

    scores.push({
      goal: subgoal,
      impact,
      urgency,
      effort,
      score
    });
  }

  scores.sort((left, right) => right.score - left.score);
  return scores;
}

function buildRiskMap(subgoals, context = {}) {
  const riskMap = [];

  for (const subgoal of subgoals) {
    const goalText = String(subgoal);
    const lower = goalText.toLowerCase();

    const risks = [];

    if (lower.match(/(integration|migration|major change)/i)) {
      risks.push({
        type: "integration-risk",
        severity: "high",
        description: `Integration risks for ${goalText.slice(0, 50)}`,
        mitigation: "Comprehensive testing and gradual rollout"
      });
    }

    if (lower.match(/(performance|optimization|scale)/i)) {
      risks.push({
        type: "performance-risk",
        severity: "medium",
        description: `Performance uncertainty for ${goalText.slice(0, 50)}`,
        mitigation: "Benchmark-driven approach and monitoring"
      });
    }

    if (lower.match(/(security|auth|permission)/i)) {
      risks.push({
        type: "security-risk",
        severity: "high",
        description: `Security considerations for ${goalText.slice(0, 50)}`,
        mitigation: "Security review and compliance validation"
      });
    }

    if (lower.match(/(data|storage|migration)/i)) {
      risks.push({
        type: "data-risk",
        severity: "medium",
        description: `Data integrity concerns for ${goalText.slice(0, 50)}`,
        mitigation: "Backup and rollback procedures"
      });
    }

    if (risks.length > 0) {
      riskMap.push({
        goal: goalText,
        risks
      });
    }
  }

  return riskMap;
}

function resolveDependencyOrder(subgoals, depGraph) {
  const visited = new Set();
  const sorted = [];

  function visit(goal) {
    if (visited.has(goal)) {
      return;
    }

    visited.add(goal);

    const deps = depGraph.get(goal) || [];
    for (const dep of deps) {
      visit(dep);
    }

    sorted.push(goal);
  }

  for (const subgoal of subgoals) {
    const goalText = typeof subgoal === "string" ? subgoal : subgoal.goal || subgoal;
    visit(goalText);
  }

  return sorted;
}

const { retrieveMemories } = require("./memory-retrieval-engine");
const { buildKnowledgeGraph } = require("./knowledge-indexer");

function collectStrategicContext(rootDir, projectName) {
  const projectDir = getProjectDir(rootDir, projectName);

  return {
    memory: readJsonSafe(path.join(projectDir, "memory", "memory.json")),
    memorySummary: readJsonSafe(path.join(projectDir, "memory", "memory-summary.json")),
    requirements: readTextSafe(path.join(projectDir, "docs", "requirements.md")),
    architecture: readTextSafe(path.join(projectDir, "docs", "architecture.md")),
    artifacts: listArtifacts(projectDir),
    completedTasks:
      readJsonSafe(path.join(projectDir, "tasks", "tasks.json"))?.tasks?.filter(
        t => t.status === "done"
      ) || [],
    state: loadState(projectDir),
    knowledgeGraph: buildKnowledgeGraph(projectDir)
  };
}

function buildExecutionOrder(priorityScores, depGraph) {
  const executed = new Set();
  const order = [];

  for (const { goal } of priorityScores) {
    const deps = depGraph.get(goal) || [];
    const unsatisfied = deps.filter(dep => !executed.has(dep));

    if (unsatisfied.length === 0) {
      order.push(goal);
      executed.add(goal);
    }
  }

  for (const { goal } of priorityScores) {
    if (!executed.has(goal)) {
      order.push(goal);
      executed.add(goal);
    }
  }

  return order;
}

function planStrategically(rootDir, projectName, options = {}) {
  const context = collectStrategicContext(rootDir, projectName);
  const topLevelGoals = options.goals || [
    ...extractGoalsFromMemory(context.memory),
    ...extractGoalsFromRequirements(context.requirements)
  ];

  if (!topLevelGoals.length) {
    topLevelGoals.push({
      source: "default",
      text: `Complete project execution for ${projectName}`
    });
  }

  const primaryGoal = topLevelGoals[0]?.text || `Strategic planning for ${projectName}`;

  const planTree = decomposeGoal(primaryGoal, 0, 5, context);
  const flatSubgoals = flattenPlanTree(planTree);
  const depGraph = buildDependencyGraph(flatSubgoals, context);
  const hiddenDeps = detectHiddenDependencies(flatSubgoals, context);
  const priorityScores = computePriorityScores(flatSubgoals);
  const executionOrder = buildExecutionOrder(priorityScores, depGraph);
  const riskMap = buildRiskMap(flatSubgoals, context);

  return {
    goal: primaryGoal,
    planTree,
    executionOrder,
    priorityScores: priorityScores.map(ps => ({
      goal: ps.goal,
      impact: ps.impact,
      urgency: ps.urgency,
      effort: ps.effort,
      score: Number(ps.score.toFixed(2))
    })),
    riskMap,
    hiddenDependencies: hiddenDeps,
    dependencyGraph: Array.from(depGraph.entries()).map(([goal, deps]) => ({
      goal,
      dependencies: deps
    })),
    timestamp: new Date().toISOString(),
    projectName,
    metadata: {
      totalSubgoals: flatSubgoals.length,
      maxDepth: 5,
      riskCount: riskMap.reduce((sum, rm) => sum + rm.risks.length, 0),
      topRisks: riskMap
        .flatMap(rm => rm.risks)
        .sort((a, b) => {
          const severityMap = { high: 3, medium: 2, low: 1 };
          return (severityMap[b.severity] || 0) - (severityMap[a.severity] || 0);
        })
        .slice(0, 3)
    }
  };
}

module.exports = {
  planStrategically,
  extractGoalsFromMemory,
  extractGoalsFromRequirements,
  analyzeGoal,
  decomposeGoal,
  buildDependencyGraph,
  detectHiddenDependencies,
  computePriorityScores,
  buildRiskMap,
  resolveDependencyOrder,
  flattenPlanTree,
  collectStrategicContext
};

if (require.main === module) {
  const projectName = process.argv[2];

  if (!projectName) {
    console.log("Usage: node workflow/strategic-planner.js ProjectName");
    process.exit(1);
  }

  const plan = planStrategically(process.cwd(), projectName);
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
