const path = require("path");

const { readJson } = require("./validation/validation-utils");

// =====================================

function loadTasks(projectDir) {
  const file = path.join(projectDir, "tasks", "tasks.json");

  const data = readJson(file);

  return data.tasks || [];
}

// =====================================

function getTaskMap(tasks) {
  const map = {};

  tasks.forEach(task => {
    map[task.id] = task;
  });

  return map;
}

// =====================================

function isTaskBlocked(task, taskMap) {
  const deps = task.dependencies || [];

  for (const depId of deps) {
    const dep = taskMap[depId];

    if (!dep) {
      return true;
    }

    if (dep.status !== "done") {
      return true;
    }
  }

  return false;
}

// =====================================

function getAvailableTasks(tasks) {
  const taskMap = getTaskMap(tasks);

  return tasks.filter(task => task.status === "todo" && !isTaskBlocked(task, taskMap));
}

// =====================================

function priorityWeight(priority) {
  switch (priority) {
    case "P1":
      return 1;

    case "P2":
      return 2;

    case "P3":
      return 3;

    default:
      return 99;
  }
}

// =====================================

function getNextAvailableTask(tasks) {
  const available = getAvailableTasks(tasks);

  if (available.length === 0) {
    return null;
  }

  available.sort((a, b) => {
    return priorityWeight(a.priority) - priorityWeight(b.priority);
  });

  return available[0];
}

// =====================================

function validateDependencyReferences(tasks) {
  const ids = new Set(tasks.map(t => t.id));

  const errors = [];

  tasks.forEach(task => {
    const deps = task.dependencies || [];

    deps.forEach(dep => {
      if (!ids.has(dep)) {
        errors.push(`${task.id} depends on missing task ${dep}`);
      }
    });
  });

  return errors;
}

// =====================================

function detectDependencyCycle(tasks) {
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

  return Object.keys(graph).some(dfs);
}

// =====================================

module.exports = {
  loadTasks,

  isTaskBlocked,

  getAvailableTasks,

  getNextAvailableTask,

  validateDependencyReferences,

  detectDependencyCycle
};
