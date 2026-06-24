const readline = require("readline");

const {
  taskExists,
  getTaskById,
  updateTaskStatus,
  getCurrentTaskId,
  clearCurrentTask,
  generateMemoryId,
  addMemoryRecord
} = require("./task-utils-v2");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];
const taskId = process.argv[3];

if (!projectName || !taskId) {
  console.log(
    "Usage: node scripts/complete-task.js ProjectName TASK-ID"
  );

  process.exit(1);
}

// =====================================
// VALIDATE
// =====================================

if (
  !taskExists(
    projectName,
    taskId
  )
) {
  console.log(
    `Task not found: ${taskId}`
  );

  process.exit(1);
}

const task =
  getTaskById(
    projectName,
    taskId
  );

if (
  task.status === "done"
) {
  console.log(
    "Task already completed"
  );

  process.exit(1);
}

// =====================================
// READLINE
// =====================================

const rl =
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

function ask(question) {
  return new Promise(resolve => {
    rl.question(
      question,
      answer =>
        resolve(answer)
    );
  });
}

// =====================================
// COMPLETE TASK
// =====================================

async function main() {
  try {
    console.log(
      `\nCompleting ${task.id}\n`
    );

    const result =
      await ask(
        "Result Summary: "
      );

    const filesChanged =
      await ask(
        "Files Changed (comma separated): "
      );

    const testsRun =
      await ask(
        "Tests Run (comma separated): "
      );

    const decisions =
      await ask(
        "Decisions Made (comma separated): "
      );

    // update task

    updateTaskStatus(
      projectName,
      taskId,
      "done"
    );

    // clear current task if needed

    if (
      getCurrentTaskId(
        projectName
      ) === taskId
    ) {
      clearCurrentTask(
        projectName
      );
    }

    // create memory record

    const memoryRecord = {
      id:
        generateMemoryId(
          projectName
        ),

      type:
        "completedTask",

      taskId:
        task.id,

      title:
        task.title,

      module:
        task.module,

      result,

      filesChanged:
        filesChanged
          .split(",")
          .map(v =>
            v.trim()
          )
          .filter(Boolean),

      testsRun:
        testsRun
          .split(",")
          .map(v =>
            v.trim()
          )
          .filter(Boolean),

      decisions:
        decisions
          .split(",")
          .map(v =>
            v.trim()
          )
          .filter(Boolean),

      completedAt:
        new Date().toISOString()
    };

    addMemoryRecord(
      projectName,
      "completedTasks",
      memoryRecord
    );

    console.log(
      "\nTask completed successfully\n"
    );

    console.log(
      `Task ID : ${task.id}`
    );

    console.log(
      `Memory  : ${memoryRecord.id}`
    );

  } catch (error) {
    console.log(
      error.message
    );
  } finally {
    rl.close();
  }
}

main();
