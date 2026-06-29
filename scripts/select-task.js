const { taskExists, getTaskById, setCurrentTask } = require("./task-utils-v2");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];
const taskId = process.argv[3];

if (!projectName || !taskId) {
  console.log("Usage: node scripts/select-task.js ProjectName TASK-ID");
  process.exit(1);
}

// =====================================
// VALIDATE TASK
// =====================================

try {
  if (!taskExists(projectName, taskId)) {
    console.log(`Task not found: ${taskId}`);

    process.exit(1);
  }

  const task = getTaskById(projectName, taskId);

  setCurrentTask(projectName, taskId);

  console.log("\nCurrent task selected successfully\n");

  console.log(`ID       : ${task.id}`);

  console.log(`Title    : ${task.title}`);

  console.log(`Module   : ${task.module}`);

  console.log(`Priority : ${task.priority}`);

  console.log(`Status   : ${task.status}`);
} catch (error) {
  console.log(error.message);

  process.exit(1);
}
