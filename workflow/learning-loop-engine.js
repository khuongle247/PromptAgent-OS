const path = require("path");
const { readJsonSafe, writeJson } = require("../scripts/validation/validation-utils");
const { loadMemory, saveMemory } = require("../scripts/task-utils-v2"); // Reusing task-utils-v2's memory functions
const { listArtifacts, readArtifact } = require("./artifact-store");
const eventBus = require("./event-bus"); // Import event bus for event-driven learning

function getProjectDir(rootDir, projectName) {
  return path.join(rootDir, "projects", projectName);
}

function analyzeExecutionResults(rootDir, projectName, executionResult) {
  const projectDir = getProjectDir(rootDir, projectName);
  const memory = loadMemory(projectName);

  const newLessons = [];

  // Analyze success patterns
  if (
    executionResult.ok &&
    executionResult.role === "reviewer" &&
    executionResult.output?.decision === "approved"
  ) {
    const taskId = executionResult.taskId;
    const coderArtifact = readArtifact(projectDir, { role: "coder", taskId });
    const architectArtifact = readArtifact(projectDir, { role: "architect", taskId: taskId }); // Architect output often applies to multiple tasks

    const successLesson = {
      id: `LESSON-${memory.decisions.length + memory.conventions.length + memory.risks.length + newLessons.length + 1}`,
      type: "success-pattern",
      timestamp: new Date().toISOString(),
      author: "system",
      description: `Task ${taskId} successfully completed and approved by reviewer.`,
      importance: 4,
      references: [taskId],
      details: {
        taskTitle: executionResult.currentTask?.title,
        coderChanges: coderArtifact?.output?.filesChanged,
        architectDecisions: architectArtifact?.output?.decisions
          .filter(d => d.relatedTasks?.includes(taskId))
          .map(d => d.title),
        promptEffectiveness: executionResult.prompt?.length || 0 // Placeholder for future prompt system integration
      }
    };
    newLessons.push(successLesson);
  }

  // Analyze failure patterns (e.g., from debugger output)
  if (
    !executionResult.ok &&
    executionResult.role === "debugger" &&
    executionResult.output?.rootCauseAnalysis
  ) {
    const taskId = executionResult.taskId;
    const bugRecord = {
      id: `BUG-${memory.bugs.length + 1}`,
      type: "bug",
      timestamp: new Date().toISOString(),
      author: "debugger",
      description: `Bug detected during task ${taskId}: ${executionResult.output.rootCauseAnalysis.rootCause}`,
      severity: executionResult.output.severity || "P2-medium",
      rootCause: executionResult.output.rootCauseAnalysis.rootCause,
      fixDescription: executionResult.output.fixDescription,
      references: [taskId]
    };
    memory.bugs.push(bugRecord);
  }

  // Update memory importance scores (simplified)
  if (
    newLessons.length > 0 ||
    memory.bugs.length >
      (readJsonSafe(path.join(projectDir, "memory", "memory.json"))?.bugs?.length || 0)
  ) {
    // Re-evaluate importance for some memory records based on recent activity
    // This is a placeholder for a more sophisticated scoring algorithm
    memory.decisions.forEach(d => {
      if (newLessons.some(l => l.references.includes(d.relatedTasks?.[0])))
        d.importance = Math.min(5, d.importance + 1);
    });
    memory.risks.forEach(r => {
      if (newLessons.some(l => l.references.includes(r.relatedTasks?.[0])))
        r.importance = Math.min(5, r.importance + 1);
    });
  }

  // Generate reusable lessons learned (placeholder for now)
  const reusableLessons = newLessons.map(lesson => ({
    category: lesson.type,
    summary: lesson.description,
    relatedMemoryId: lesson.id
  }));

  // Add new lessons to memory (e.g., as 'conventions' or a new 'lessons' category if schema allows)
  // For now, we'll add them as decisions or conventions based on type
  newLessons.forEach(lesson => {
    if (lesson.type === "success-pattern") {
      memory.conventions.push({
        ...lesson,
        type: "convention",
        scope: "project",
        enforcement: "guideline",
        example: JSON.stringify(lesson.details)
      });
    }
  });

  saveMemory(projectName, memory);

  // Emit LessonLearned event for each new lesson captured
  newLessons.forEach(lesson => {
    eventBus.publish("lesson-learned", {
      lessonId: lesson.id,
      type: lesson.type,
      description: lesson.description,
      references: lesson.references || [],
      details: lesson.details || {},
      timestamp: new Date().toISOString(),
      schemaVersion: "1.0"
    });
  });

  // Emit MemoryImportanceUpdated event if importance scores were adjusted
  const importanceChanges = [];
  memory.decisions.forEach(d => {
    if (newLessons.some(l => l.references.includes(d.relatedTasks?.[0]))) {
      importanceChanges.push({
        memoryId: d.id || `MEM-${Date.now().toString(36)}`,
        oldImportance: d.importance - 1,
        newImportance: d.importance
      });
    }
  });
  memory.risks.forEach(r => {
    if (newLessons.some(l => l.references.includes(r.relatedTasks?.[0]))) {
      importanceChanges.push({
        memoryId: r.id || `MEM-${Date.now().toString(36)}`,
        oldImportance: r.importance - 1,
        newImportance: r.importance
      });
    }
  });
  importanceChanges.forEach(change => {
    eventBus.publish("memory-importance-updated", {
      memoryId: change.memoryId,
      oldImportance: change.oldImportance,
      newImportance: change.newImportance,
      timestamp: new Date().toISOString(),
      schemaVersion: "1.0"
    });
  });

  // Emit ReusablePatternIdentified event for each reusable lesson identified
  reusableLessons.forEach(pattern => {
    eventBus.publish("reusable-pattern-identified", {
      patternId: pattern.relatedMemoryId || `PATTERN-${Date.now().toString(36)}`,
      description: pattern.summary || "Reusable pattern identified from execution analysis.",
      count: 2, // Initial count; could be accumulated over time
      exampleReferences: [pattern.relatedMemoryId].filter(Boolean),
      timestamp: new Date().toISOString(),
      schemaVersion: "1.0"
    });
  });

  return { newLessons, reusableLessons, updatedMemory: memory };
}

module.exports = {
  analyzeExecutionResults
};
