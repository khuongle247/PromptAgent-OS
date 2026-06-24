const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ======================================
// PROJECT NAME
// ======================================

const projectName = process.argv[2];

if (!projectName) {
  console.log(
    "Usage: node scripts/generate-prompt.js ProjectName"
  );
  process.exit(1);
}

// ======================================
// AUTO UPDATE CURRENT TASK
// ======================================

try {
  execSync(
    `node scripts/task-engine.js ${projectName}`,
    {
      stdio: "ignore"
    }
  );
} catch (error) {
  console.log(
    "Task Engine Error"
  );
}

// ======================================
// AUTO UPDATE MEMORY SUMMARY
// ======================================

try {
  execSync(
    `node scripts/memory-manager.js ${projectName}`,
    {
      stdio: "ignore"
    }
  );
} catch (error) {
  console.log(
    "Memory Manager Error"
  );
}

// ======================================
// HELPERS
// ======================================

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(
    filePath,
    "utf8"
  );
}

// ======================================
// PATHS
// ======================================

const docsPath = path.join(
  projectName,
  "docs"
);

const contextPath = path.join(
  projectName,
  "context"
);

// ======================================
// DOCS
// ======================================

const requirements = readFile(
  path.join(
    docsPath,
    "requirements.md"
  )
);

const features = readFile(
  path.join(
    docsPath,
    "features.md"
  )
);

const architecture = readFile(
  path.join(
    docsPath,
    "architecture.md"
  )
);

const memorySummary =
  readFile(
    path.join(
      docsPath,
      "memory-summary.md"
    )
  );

const decisions = readFile(
  path.join(
    docsPath,
    "decisions.md"
  )
);

const changelog = readFile(
  path.join(
    docsPath,
    "changelog.md"
  )
);

// ======================================
// CONTEXT
// ======================================

const techStack = readFile(
  path.join(
    contextPath,
    "tech-stack.md"
  )
);

const codingRules =
  readFile(
    path.join(
      contextPath,
      "coding-rules.md"
    )
  );

const architectureRules =
  readFile(
    path.join(
      contextPath,
      "architecture-rules.md"
    )
  );

const aiRules = readFile(
  path.join(
    contextPath,
    "ai-rules.md"
  )
);

// ======================================
// CURRENT TASK
// ======================================

const currentTask =
  readFile(
    path.join(
      projectName,
      "current-task.md"
    )
  ) || "PROJECT COMPLETED";

// ======================================
// BUILD PROMPT
// ======================================

const prompt = `
# PROJECT CONTEXT

## REQUIREMENTS

${requirements}

---

## FEATURES

${features}

---

## ARCHITECTURE

${architecture}

---

## DECISIONS

${decisions}

---

## MEMORY SUMMARY

${memorySummary}

---

## CHANGELOG

${changelog}

# TECH STACK

${techStack}

# CODING RULES

${codingRules}

# ARCHITECTURE RULES

${architectureRules}

# AI RULES

${aiRules}

# CURRENT TASK

${currentTask}

# TASK EXECUTION RULES

1. Chỉ thực hiện CURRENT TASK.
2. Không sửa module ngoài phạm vi task.
3. Không thay đổi kiến trúc.
4. Tuân thủ TECH STACK.
5. Tuân thủ CODING RULES.
6. Tuân thủ ARCHITECTURE RULES.
7. Nếu thiếu thông tin phải hỏi trước.
8. Review code sau khi hoàn thành.
9. Đề xuất task tiếp theo.

# RESPONSE FORMAT

## Analysis

## Plan

## Files To Change

## Implementation

## Review

## Next Task
`;

// ======================================
// SAVE
// ======================================

const outputPath = path.join(
  projectName,
  "prompt-output.md"
);

fs.writeFileSync(
  outputPath,
  prompt,
  "utf8"
);

// ======================================
// LOG
// ======================================

console.log(
  "Prompt generated successfully"
);

console.log(
  `Current Task: ${currentTask}`
);

console.log(
  `Output: ${outputPath}`
);