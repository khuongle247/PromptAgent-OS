const fs = require("fs");
const path = require("path");

// =====================================
// HELPERS
// =====================================

function getProjectDir(projectName) {
  return path.join(
    process.cwd(),
    "projects",
    projectName
  );
}

function ensureProjectExists(projectName) {
  const projectDir = getProjectDir(projectName);

  if (!fs.existsSync(projectDir)) {
    throw new Error(
      `Project not found: ${projectName}`
    );
  }

  return projectDir;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `File not found: ${filePath}`
    );
  }

  try {
    const content =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid JSON: ${filePath}`
    );
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

// =====================================
// PROJECT
// =====================================

function loadProject(projectName) {
  const filePath = path.join(
    ensureProjectExists(projectName),
    "project.json"
  );

  return readJson(filePath);
}

function saveProject(
  projectName,
  projectData
) {
  const filePath = path.join(
    ensureProjectExists(projectName),
    "project.json"
  );

  projectData.updatedAt =
    new Date().toISOString();

  writeJson(
    filePath,
    projectData
  );
}

// =====================================
// TASKS
// =====================================

function getTasksPath(
  projectName
) {
  return path.join(
    ensureProjectExists(projectName),
    "tasks",
    "tasks.json"
  );
}

function loadTasks(
  projectName
) {
  return readJson(
    getTasksPath(projectName)
  );
}

function saveTasks(
  projectName,
  tasksData
) {
  writeJson(
    getTasksPath(projectName),
    tasksData
  );
}

function getAllTasks(
  projectName
) {
  const data =
    loadTasks(projectName);

  return data.tasks || [];
}

function getTaskById(
  projectName,
  taskId
) {
  const tasks =
    getAllTasks(projectName);

  return (
    tasks.find(
      task => task.id === taskId
    ) || null
  );
}

function taskExists(
  projectName,
  taskId
) {
  return !!getTaskById(
    projectName,
    taskId
  );
}

// =====================================
// CURRENT TASK
// =====================================

function getCurrentTaskPath(
  projectName
) {
  return path.join(
    ensureProjectExists(projectName),
    "tasks",
    "current-task.json"
  );
}

function getCurrentTaskId(
  projectName
) {
  const data = readJson(
    getCurrentTaskPath(
      projectName
    )
  );

  return data.taskId;
}

function getCurrentTask(
  projectName
) {
  const taskId =
    getCurrentTaskId(
      projectName
    );

  if (!taskId) {
    return null;
  }

  return getTaskById(
    projectName,
    taskId
  );
}

function setCurrentTask(
  projectName,
  taskId
) {
  if (
    !taskExists(
      projectName,
      taskId
    )
  ) {
    throw new Error(
      `Task not found: ${taskId}`
    );
  }

  writeJson(
    getCurrentTaskPath(
      projectName
    ),
    {
      taskId
    }
  );
}

function clearCurrentTask(
  projectName
) {
  writeJson(
    getCurrentTaskPath(
      projectName
    ),
    {
      taskId: null
    }
  );
}

// =====================================
// TASK STATUS
// =====================================

function updateTaskStatus(
  projectName,
  taskId,
  newStatus
) {
  const data =
    loadTasks(projectName);

  const task =
    data.tasks.find(
      t => t.id === taskId
    );

  if (!task) {
    throw new Error(
      `Task not found: ${taskId}`
    );
  }

  task.status = newStatus;

  task.updatedAt =
    new Date().toISOString();

  saveTasks(
    projectName,
    data
  );

  return task;
}

// =====================================
// TASK CREATION
// =====================================

function generateTaskId(
  projectName
) {
  const tasks =
    getAllTasks(projectName);

  if (
    tasks.length === 0
  ) {
    return "TASK-001";
  }

  const numbers = tasks
    .map(task => {
      const match =
        task.id.match(
          /TASK-(\d+)/
        );

      return match
        ? parseInt(
            match[1],
            10
          )
        : 0;
    })
    .sort(
      (a, b) => b - a
    );

  const next =
    numbers[0] + 1;

  return `TASK-${String(
    next
  ).padStart(3, "0")}`;
}

function createTask(
  projectName,
  taskData
) {
  const data =
    loadTasks(projectName);

  const task = {
    id:
      generateTaskId(
        projectName
      ),

    title:
      taskData.title ||
      "Untitled Task",

    module:
      taskData.module ||
      "GENERAL",

    priority:
      taskData.priority ||
      "P2",

    status: "todo",

    dependencies:
      taskData.dependencies ||
      [],

    estimate:
      taskData.estimate ||
      "",

    assignee:
      taskData.assignee ||
      "coder",

    acceptanceCriteria:
      taskData.acceptanceCriteria ||
      [],

    definitionOfDone:
      taskData.definitionOfDone ||
      [],

    source:
      taskData.source ||
      "human",

    milestoneId:
      taskData.milestoneId ||
      "",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()
  };

  data.tasks.push(task);

  saveTasks(
    projectName,
    data
  );

  return task;
}

// =====================================
// TASK QUERIES
// =====================================

function getTasksByStatus(
  projectName,
  status
) {
  return getAllTasks(
    projectName
  ).filter(
    task =>
      task.status === status
  );
}

function getNextTodoTask(
  projectName
) {
  return (
    getAllTasks(projectName)
      .find(
        task =>
          task.status ===
          "todo"
      ) || null
  );
}

function selectNextTodoTask(
  projectName
) {
  const task =
    getNextTodoTask(
      projectName
    );

  if (!task) {
    return null;
  }

  setCurrentTask(
    projectName,
    task.id
  );

  return task;
}

function getCompletedTasks(
  projectName
) {
  return getTasksByStatus(
    projectName,
    "done"
  );
}

// =====================================
// MEMORY
// =====================================

function getMemoryPath(
  projectName
) {
  return path.join(
    ensureProjectExists(projectName),
    "memory",
    "memory.json"
  );
}

function loadMemory(
  projectName
) {
  return readJson(
    getMemoryPath(projectName)
  );
}

function saveMemory(
  projectName,
  memoryData
) {
  writeJson(
    getMemoryPath(projectName),
    memoryData
  );
}

function generateMemoryId(
  projectName
) {
  const memory =
    loadMemory(projectName);

  const allRecords = [
    ...(memory.decisions || []),
    ...(memory.architecture || []),
    ...(memory.completedTasks || []),
    ...(memory.bugs || []),
    ...(memory.conventions || []),
    ...(memory.risks || [])
  ];

  if (allRecords.length === 0) {
    return "MEM-001";
  }

  const max =
    Math.max(
      ...allRecords.map(item => {
        const match =
          item.id?.match(
            /MEM-(\d+)/
          );

        return match
          ? Number(match[1])
          : 0;
      })
    );

  return `MEM-${String(
    max + 1
  ).padStart(3, "0")}`;
}

function addMemoryRecord(
  projectName,
  category,
  record
) {
  const memory =
    loadMemory(projectName);

  if (!memory[category]) {
    throw new Error(
      `Invalid memory category: ${category}`
    );
  }

  memory[category].push(record);

  saveMemory(
    projectName,
    memory
  );

  return record;
}

function removeCompletedTaskMemory(
  projectName,
  taskId
) {
  const memory =
    loadMemory(projectName);

  const before =
    memory.completedTasks.length;

  memory.completedTasks =
    memory.completedTasks.filter(
      item =>
        item.taskId !== taskId
    );

  saveMemory(
    projectName,
    memory
  );

  return (
    before -
    memory.completedTasks.length
  );
}

// =====================================
// EXPORTS
// =====================================

module.exports = {
  loadProject,
  saveProject,

  loadTasks,
  saveTasks,

  getAllTasks,
  getTaskById,
  taskExists,

  getCurrentTaskId,
  getCurrentTask,
  setCurrentTask,
  clearCurrentTask,

  updateTaskStatus,

  generateTaskId,
  createTask,

  getTasksByStatus,
  getNextTodoTask,
  selectNextTodoTask,
  getCompletedTasks,

  loadMemory,
  saveMemory,
  generateMemoryId,
  addMemoryRecord,
  removeCompletedTaskMemory
};
