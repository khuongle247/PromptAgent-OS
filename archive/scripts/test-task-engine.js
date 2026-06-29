const path = require("path");

const {
  loadTasks,
  getAvailableTasks,
  getNextAvailableTask
} = require("./task-engine-v3");

const project =
  process.argv[2];

const projectDir =
  path.join(
    process.cwd(),
    "projects",
    project
  );

const tasks =
  loadTasks(projectDir);

console.log(
  "\nAVAILABLE TASKS\n"
);

console.log(
  getAvailableTasks(tasks)
  .map(t => t.id)
);

console.log(
  "\nNEXT TASK\n"
);

console.log(
  getNextAvailableTask(tasks)
);