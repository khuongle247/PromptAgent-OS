const {
  readTasks,
  writeCurrentTask
} = require("./task-utils");

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node task-engine.js ProjectName"
  );
  process.exit(1);
}

try {
  const tasks = readTasks(projectName);

  const nextTask = tasks.find(task =>
    task.startsWith("[ ]")
  );

  if (!nextTask) {
    console.log(
      "All tasks completed"
    );

    writeCurrentTask(
      projectName,
      "PROJECT COMPLETED"
    );

    process.exit(0);
  }

  const taskName = nextTask
    .replace("[ ]", "")
    .trim();

  writeCurrentTask(
    projectName,
    taskName
  );

  console.log(
    `Current Task: ${taskName}`
  );
} catch (error) {
  console.error(error.message);
}