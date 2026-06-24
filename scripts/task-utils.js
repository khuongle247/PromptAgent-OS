const fs = require("fs");
const path = require("path");

function getTasksPath(projectName) {
  return path.join(
    projectName,
    "docs",
    "tasks.md"
  );
}

function getCurrentTaskPath(projectName) {
  return path.join(
    projectName,
    "current-task.md"
  );
}

function readTasks(projectName) {
  const tasksPath = getTasksPath(projectName);

  if (!fs.existsSync(tasksPath)) {
    throw new Error("tasks.md not found");
  }

  const content = fs.readFileSync(
    tasksPath,
    "utf8"
  );

  return content
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function writeTasks(projectName, tasks) {
  const tasksPath = getTasksPath(projectName);

  fs.writeFileSync(
    tasksPath,
    tasks.join("\n"),
    "utf8"
  );
}

function writeCurrentTask(
  projectName,
  task
) {
  const currentTaskPath =
    getCurrentTaskPath(projectName);

  fs.writeFileSync(
    currentTaskPath,
    task,
    "utf8"
  );
}

module.exports = {
  readTasks,
  writeTasks,
  writeCurrentTask
};