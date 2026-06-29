const path = require("path");
const { readJsonSafe } = require("../scripts/validation/validation-utils");

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function loadMemory(projectDir) {
  const memoryPath = path.join(projectDir, "memory", "memory.json");
  return (
    readJsonSafe(memoryPath) || {
      decisions: [],
      architecture: [],
      completedTasks: [],
      bugs: [],
      conventions: [],
      risks: []
    }
  );
}

function rankMemories(query, memories) {
  const queryLower = query.toLowerCase();
  return memories
    .map(mem => {
      let score = 0;
      const descriptionLower = (mem.description || "").toLowerCase();
      const titleLower = (mem.title || "").toLowerCase();
      const typeLower = (mem.type || "").toLowerCase();
      const taskIdLower = (mem.taskId || "").toLowerCase();

      if (descriptionLower.includes(queryLower)) score += 5;
      if (titleLower.includes(queryLower)) score += 4;
      if (typeLower.includes(queryLower)) score += 2;
      if (taskIdLower.includes(queryLower)) score += 1;

      // Keyword matching (simplified)
      if (queryLower.includes("task") && mem.type === "completedTask") score += 3;
      if (queryLower.includes("architecture") && mem.type === "architecture") score += 3;
      if (queryLower.includes("risk") && mem.type === "risk") score += 3;
      if (queryLower.includes("bug") && mem.type === "bug") score += 3;

      return { ...mem, retrievalScore: score };
    })
    .filter(mem => mem.retrievalScore > 0)
    .sort((a, b) => b.retrievalScore - a.retrievalScore);
}

function retrieveMemories(rootDir, projectName, query, options = {}) {
  const projectDir = getProjectDir(rootDir, projectName);
  const memory = loadMemory(projectDir);

  let filteredMemories = [];

  if (options.taskType) {
    filteredMemories.push(...memory.completedTasks.filter(t => t.module === options.taskType));
  }
  if (options.architectureArea) {
    filteredMemories.push(
      ...memory.architecture.filter(a =>
        (a.context || "").toLowerCase().includes(options.architectureArea.toLowerCase())
      )
    );
  }
  if (options.riskCategory) {
    filteredMemories.push(...memory.risks.filter(r => r.type === options.riskCategory));
  }
  if (options.failurePattern) {
    filteredMemories.push(
      ...memory.bugs.filter(b =>
        (b.rootCause || "").toLowerCase().includes(options.failurePattern.toLowerCase())
      )
    );
  }

  const allMemories = [
    ...memory.decisions,
    ...memory.architecture,
    ...memory.completedTasks,
    ...memory.bugs,
    ...memory.conventions,
    ...memory.risks
  ];

  if (filteredMemories.length === 0) {
    filteredMemories = allMemories;
  }

  return rankMemories(query, filteredMemories).slice(0, options.limit || 10);
}

module.exports = {
  retrieveMemories,
  loadMemory,
  rankMemories
};
