const fs = require("fs");
const path = require("path");
const readline = require("readline");

const {
  createTask,
  loadProject
} = require("./task-utils-v2");

// =====================================
// INPUT
// =====================================

const projectName = process.argv[2];
const jsonFile = process.argv[3];

if (!projectName) {
  console.log(
    "Usage: node scripts/create-task.js ProjectName [task.json]"
  );
  process.exit(1);
}

// =====================================
// VALIDATE PROJECT
// =====================================

try {
  loadProject(projectName);
} catch (error) {
  console.log(error.message);
  process.exit(1);
}

// =====================================
// CREATE FROM JSON FILE
// =====================================

if (jsonFile) {
  try {
    const taskData = JSON.parse(
      fs.readFileSync(
        path.resolve(jsonFile),
        "utf8"
      )
    );

    const task =
      createTask(
        projectName,
        taskData
      );

    console.log(
      "\nTask created successfully\n"
    );

    console.log(task);

    process.exit(0);

  } catch (error) {
    console.log(
      `Failed to create task: ${error.message}`
    );

    process.exit(1);
  }
}

// =====================================
// INTERACTIVE MODE
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
      answer => {
        resolve(answer);
      }
    );
  });
}

async function main() {
  try {
    console.log(
      `\nCreate Task for ${projectName}\n`
    );

    const title =
      await ask(
        "Title: "
      );

    const module =
      await ask(
        "Module (AUTH/TRANSACTION/UI/etc): "
      );

    const priority =
      await ask(
        "Priority (P1/P2/P3): "
      );

    const estimate =
      await ask(
        "Estimate (2h, 1d, 3d): "
      );

    const acceptance =
      await ask(
        "Acceptance Criteria (comma separated): "
      );

    const definition =
      await ask(
        "Definition Of Done (comma separated): "
      );

    const task =
      createTask(
        projectName,
        {
          title,

          module,

          priority,

          estimate,

          acceptanceCriteria:
            acceptance
              .split(",")
              .map(v => v.trim())
              .filter(Boolean),

          definitionOfDone:
            definition
              .split(",")
              .map(v => v.trim())
              .filter(Boolean)
        }
      );

    console.log(
      "\nTask created successfully\n"
    );

    console.log(task);

  } catch (error) {
    console.log(
      error.message
    );
  } finally {
    rl.close();
  }
}

main();