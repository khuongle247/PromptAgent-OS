const {
  taskExists,
  getTaskById,
  updateTaskStatus,
  setCurrentTask,
  removeCompletedTaskMemory
} = require("./task-utils-v2");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];
const taskId = process.argv[3];

if (!projectName || !taskId) {
  console.log("Usage: node scripts/rollback-task.js ProjectName TASK-ID");

  process.exit(1);
}

// =====================================
// VALIDATE
// =====================================

if (!taskExists(projectName, taskId)) {
  console.log(`Task not found: ${taskId}`);

  process.exit(1);
}

const task = getTaskById(projectName, taskId);

if (task.status !== "done") {
  console.log("Task is not completed");

  process.exit(1);
}

// =====================================
// ROLLBACK
// =====================================

try {
  updateTaskStatus(projectName, taskId, "todo");

  const removed = removeCompletedTaskMemory(projectName, taskId);

  setCurrentTask(projectName, taskId);

  console.log("\nRollback successful\n");

  console.log(`Task ID         : ${task.id}`);

  console.log(`Status          : todo`);

  console.log(`Memory Removed  : ${removed}`);
} catch (error) {
  console.log(error.message);

  process.exit(1);
}
