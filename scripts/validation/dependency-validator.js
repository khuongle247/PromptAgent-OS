const path = require("path");

const { readJson, addError } = require("./validation-utils");

function validateDependencies(projectDir, report) {
  const tasksFile = readJson(path.join(projectDir, "tasks", "tasks.json"));

  const tasks = tasksFile.tasks || [];

  tasks.forEach(task => {
    const deps = task.dependencies || [];

    deps.forEach(dep => {
      const exists = tasks.some(t => t.id === dep);

      if (!exists) {
        addError(report, `${task.id} depends on missing task ${dep}`);
      }
    });
  });

  const graph = {};

  tasks.forEach(task => {
    graph[task.id] = task.dependencies || [];
  });

  const visiting = new Set();

  const visited = new Set();

  function dfs(node) {
    if (visiting.has(node)) {
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);

    for (const next of graph[node] || []) {
      if (dfs(next)) {
        return true;
      }
    }

    visiting.delete(node);

    visited.add(node);

    return false;
  }

  const hasCycle = Object.keys(graph).some(dfs);

  if (hasCycle) {
    addError(report, "Dependency cycle detected");
  }
}

module.exports = {
  validateDependencies
};
